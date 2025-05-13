import { expect, test } from 'vitest';

import { TaskController } from '../../tools/queue';
import { core } from '../core';
import { run } from './runner';

// There are 3 attempts to kill a process using different signals. Each attempt
// is limited to 1 second.
const maxKillTimeMs = 15000;

const controller = new TaskController();

test('stdout and stderr are combined in the right order', async () => {
  const process = run({
    command:
      'echo "stdout"; >&2 echo "stderr"; echo "stdout"; >&2 echo "stderr"',
    controller,
  });
  const output: Array<string> = [];
  process.output.subscribe((chunk) => {
    output.push(chunk);
  });
  await process.result;
  expect(output.join('')).toStrictEqual('stdout\nstderr\nstdout\nstderr\n');
});

test('output can be captured in real-time', async () => {
  const process = run({
    command: 'echo "hello"; sleep 0.1; echo "world"',
    controller,
  });
  const output: Array<string> = [];
  process.output.subscribe((chunk) => {
    output.push(chunk);
  });
  await process.result;
  expect(output).toStrictEqual(['hello\n', 'world\n']);
});

test('a process can be killed', async () => {
  const startedAtMs = Date.now();
  const process = run({
    command: 'while true; do sleep 86400; done',
    controller,
  });
  await process.kill();
  const { exitCode } = await process.result;
  expect(exitCode === null || typeof exitCode === 'number').toBeTruthy();
  const killedAfterMs = Date.now() - startedAtMs;
  expect(killedAfterMs).lessThan(maxKillTimeMs);
});

test('a process can be killed via controller', async () => {
  const startedAtMs = Date.now();
  const controller = new TaskController();
  const process = run({
    command: 'while true; do sleep 86400; done',
    controller,
  });
  controller.cancel();
  await process.result;
  const { exitCode } = await process.result;
  expect(exitCode === null || typeof exitCode === 'number').toBeTruthy();
  const killedAfterMs = Date.now() - startedAtMs;
  expect(killedAfterMs).lessThan(maxKillTimeMs);
});

test('a stuck process can be killed', async () => {
  const startedAtMs = Date.now();
  const process = run({
    command: "trap '' INT; while true; do sleep 86400; done",
    controller,
  });
  await process.kill();
  const { exitCode } = await process.result;
  expect(exitCode === null || typeof exitCode === 'number').toBeTruthy();
  const killedAfterMs = Date.now() - startedAtMs;
  expect(killedAfterMs).lessThan(maxKillTimeMs);
});

test('writes to core output', async () => {
  const output: Array<string> = [];
  core.output$.subscribe((chunk) => {
    output.push(chunk);
  });
  const process = run({
    command: 'echo "hello"',
    controller,
  });
  const { exitCode } = await process.result;
  expect(exitCode).toBe(0);
  expect(output).toStrictEqual([
    'ℹ️ Starting command: "echo "hello""\n',
    'hello\n',
    '✅ Command exited: "echo "hello""\n',
  ]);
});

test('exit code of a failed command is logged', async () => {
  const output: Array<string> = [];
  core.output$.subscribe((chunk) => {
    output.push(chunk);
  });
  const process = run({
    command: 'I_DO_NOT_EXIST',
    controller,
  });
  const { exitCode } = await process.result;
  expect(exitCode).toBe(127);
  // Depending on the OS, the error message can be different. Also, the amount
  // of error message lines can differ.
  expect(output.at(0)).toStrictEqual('ℹ️ Starting command: "I_DO_NOT_EXIST"\n');
  expect(
    output.find((line) => line.match(/I_DO_NOT_EXIST.*not found/)),
  ).toBeTruthy();
  expect(output.at(-1)).toStrictEqual(
    '❌ Command exited with 127: "I_DO_NOT_EXIST"\n',
  );
});

test('outputTimeout is not exceeded', async () => {
  const output: Array<string> = [];
  core.output$.subscribe((chunk) => {
    output.push(chunk);
  });
  const process = run({
    command: 'sleep 0.1',
    controller,
    outputTimeout: 200,
  });
  await process.result;
  expect(output).toStrictEqual([
    'ℹ️ Starting command: "sleep 0.1"\n',
    '✅ Command exited: "sleep 0.1"\n',
  ]);
});

test('outputTimeout is exceeded', async () => {
  const output: Array<string> = [];
  core.output$.subscribe((chunk) => {
    output.push(chunk);
  });
  const process = run({
    command: 'sleep 0.3',
    controller,
    outputTimeout: 100,
  });
  await process.result;
  expect(output).toStrictEqual([
    'ℹ️ Starting command: "sleep 0.3"\n',
    '⚠️ Killing command due to the output timeout (100ms): "sleep 0.3"\n',
    'ℹ️ Killing command: "sleep 0.3"\n',
    '✅ Command killed with SIGINT signal: "sleep 0.3"\n',
  ]);
});

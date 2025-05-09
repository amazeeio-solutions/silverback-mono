import { spawn } from 'child_process';
import stripAnsi from 'strip-ansi';

import { OutputSubject } from '../../tools/output';
import { TaskController } from '../../tools/queue';
import { core } from '../core';
import { terminate } from './terminate';

type Result = {
  exitCode: number | null;
};

export type Process = {
  output: OutputSubject;
  result: Promise<Result>;
  kill: () => Promise<void>;
};

export const run = (options: {
  command: string;
  controller: TaskController;
  outputTimeout?: number;
}): Process => {
  core.output$.next(`Starting command: "${options.command}"`, 'info');
  const process = spawn(`( ${options.command} ) 2>&1`, { shell: '/bin/sh' });

  let outputTimeout: NodeJS.Timeout | undefined;
  const setOutputTimeout = (stop = false): void => {
    clearTimeout(outputTimeout);
    if (stop) {
      return;
    }
    const timeout = options.outputTimeout;
    if (!timeout) {
      return;
    }
    outputTimeout = setTimeout(() => {
      core.output$.next(
        `Killing command due to the output timeout (${timeout}ms): "${options.command}"`,
        'warning',
      );
      kill();
    }, timeout);
  };

  setOutputTimeout();
  const output = new OutputSubject();
  process.stdout?.on('data', (chunk) => {
    setOutputTimeout();
    const string = stripAnsi(`${chunk}`);
    if (string.trim() === '') {
      return;
    }

    // Not sure why, maybe because of stripAnsi, but sometimes there are two
    // newlines at the end of the "gatsby build" chunk.
    const cleaned = string.replace(/\n{2}$/, '\n');

    output.next(cleaned);
    core.output$.next(cleaned);
  });

  let killSignal: null | NodeJS.Signals = null;

  const result = new Promise<Result>((resolve) => {
    process.on('exit', (code): void => {
      if (killSignal) {
        core.output$.next(
          `Command killed with ${killSignal} signal: "${options.command}"`,
          'success',
        );
      } else if (code === 0) {
        core.output$.next(`Command exited: "${options.command}"`, 'success');
      } else {
        core.output$.next(
          `Command exited with ${code}: "${options.command}"`,
          'error',
        );
      }
      setOutputTimeout(true);
      resolve({ exitCode: code });
    });
  });

  const kill = async (): Promise<void> => {
    if (process.pid === undefined) {
      core.output$.next(
        `Cannot find process pid for command: "${options.command}"`,
        'error',
      );
      return;
    }
    core.output$.next(`Killing command: "${options.command}"`, 'info');
    const signals: Array<NodeJS.Signals> = ['SIGINT', 'SIGTERM', 'SIGKILL'];
    while (signals.length) {
      const signal = signals.shift()!;
      killSignal = signal;
      try {
        await terminate(process.pid, signal, { timeout: 1000 });
        return;
      } catch (error) {
        console.log('An attempt to kill the process failed:', {
          command: options.command,
          signal,
          error,
        });
      }
    }
    throw new Error(`Failed to kill "${options.command}" process.`);
  };

  options.controller?.onCancel(() => kill());

  return {
    output,
    result,
    kill,
  };
};

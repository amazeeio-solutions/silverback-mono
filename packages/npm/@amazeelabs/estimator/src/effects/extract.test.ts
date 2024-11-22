/* eslint-disable @typescript-eslint/no-explicit-any */

import { FileSystem } from '@effect/platform';
import { Effect } from 'effect';
import { isFailure, isSuccess } from 'effect/Exit';
import { expect, test } from 'vitest';

import { extract } from './extract.js';

test('correct graphql file', async () => {
  const mock = FileSystem.FileSystem.of({
    readFile: () => Effect.succeed(Buffer.from('type Query { hello: String }')),
  } as any);
  const result = await Effect.runPromiseExit(
    extract('test.graphql').pipe(
      Effect.provideService(FileSystem.FileSystem, mock),
    ),
  );
  expect(isSuccess(result)).toBe(true);
  if (isSuccess(result)) {
    expect(result.value.length).toBe(1);
    expect(result.value[0].kind).toBe('Document');
  }
});

test('broken graphql file', async () => {
  const mock = FileSystem.FileSystem.of({
    readFile: () =>
      Effect.succeed(
        Buffer.from(['type Query {', '  hello: String', ''].join('\n')),
      ),
  } as any);
  const result = await Effect.runPromiseExit(
    extract('test.graphql').pipe(
      Effect.provideService(FileSystem.FileSystem, mock),
    ),
  );
  expect(isFailure(result)).toBe(true);
  if (isFailure(result)) {
    expect(result.cause.toString()).toContain(
      `ExtractionError: "Syntax Error: Expected Name, found <EOF>." in "test.graphql:3:1"`,
    );
  }
});

test('typescript file without documents', async () => {
  const mock = FileSystem.FileSystem.of({
    readFile: () => Effect.succeed(Buffer.from('const a = 1;')),
  } as any);
  const result = await Effect.runPromiseExit(
    extract('test.ts').pipe(Effect.provideService(FileSystem.FileSystem, mock)),
  );
  expect(isSuccess(result)).toBe(true);
  if (isSuccess(result)) {
    expect(result.value.length).toBe(0);
  }
});

test('broken typescript file', async () => {
  const mock = FileSystem.FileSystem.of({
    readFile: () => Effect.succeed(Buffer.from('cons a = 1;')),
  } as any);
  const result = await Effect.runPromiseExit(
    extract('test.ts').pipe(Effect.provideService(FileSystem.FileSystem, mock)),
  );
  expect(isFailure(result)).toBe(true);
  if (isFailure(result)) {
    expect(result.cause.toString()).toContain(
      `"Missing semicolon. (1:4)" in "test.ts:1:4"`,
    );
  }
});

test('typescript file with documents', async () => {
  const mock = FileSystem.FileSystem.of({
    readFile: () =>
      Effect.succeed(
        Buffer.from(
          [
            'const a = gql`type Query { hello: String }`;',
            'const b = gql`query { hello }`;',
          ].join('\n'),
        ),
      ),
  } as any);
  const result = await Effect.runPromiseExit(
    extract('test.ts').pipe(Effect.provideService(FileSystem.FileSystem, mock)),
  );
  expect(isSuccess(result)).toBe(true);
  if (isSuccess(result)) {
    expect(result.value.length).toBe(2);
    expect(result.value[0].kind).toBe('Document');
    expect(result.value[1].kind).toBe('Document');
  }
});

test('typescript file with broken documents', async () => {
  const mock = FileSystem.FileSystem.of({
    readFile: () =>
      Effect.succeed(
        Buffer.from(
          [
            'const a = gql`type Query { hello: String }`;',
            'const b = gql`query { hello`;',
          ].join('\n'),
        ),
      ),
  } as any);
  const result = await Effect.runPromiseExit(
    extract('test.ts').pipe(Effect.provideService(FileSystem.FileSystem, mock)),
  );
  expect(isFailure(result)).toBe(true);
  if (isFailure(result)) {
    expect(result.cause.toString()).toContain(
      `ExtractionError: "Syntax Error: Expected Name, found <EOF>." in "test.ts:2:26"`,
    );
  }
});

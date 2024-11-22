import { HttpClient } from '@effect/platform';
import { layer } from '@effect/platform/Http/Client';
import { NodeContext } from '@effect/platform-node';
import { ConfigProvider, Effect, Exit, Layer } from 'effect';
import { isFailure, isSuccess } from 'effect/Exit';
import { afterEach, beforeEach } from 'vitest';

import { Repository } from './helpers/repository.js';
import { ConfigFile, makeConfigFile } from './services/configfile.js';
import { Git, makeGit } from './services/git.js';
import { makeStorage, Storage } from './services/storage.js';

type Context = { repo: Repository };

const makeTestEnv = (dir: string) => {
  const configFile = Layer.effect(
    ConfigFile,
    makeConfigFile(dir).pipe(Effect.provide(NodeContext.layer)),
  );

  const git = Layer.effect(
    Git,
    makeGit.pipe(Effect.provide(configFile), Effect.provide(NodeContext.layer)),
  );

  const storage = Layer.effect(
    Storage,
    makeStorage.pipe(
      Effect.provide(NodeContext.layer),
      Effect.provide(configFile),
      Effect.provide(HttpClient.client.layer),
    ),
  );

  return Layer.mergeAll(layer, NodeContext.layer, configFile, git, storage);
};

declare module 'vitest' {
  export interface TestContext {
    repo: Repository;
    effectValue: <A, E>(
      effect: Effect.Effect<
        A,
        E,
        Layer.Layer.Success<ReturnType<typeof makeTestEnv>>
      >,
      config?: Record<string, string>,
    ) => Promise<A>;
    effectError: <A, E>(
      effect: Effect.Effect<
        A,
        E,
        Layer.Layer.Success<ReturnType<typeof makeTestEnv>>
      >,
      config?: Record<string, string>,
    ) => Promise<string>;
  }
}

function assertSuccess<A, E>(
  exit: Exit.Exit<A, E>,
): asserts exit is Exit.Success<A, E> {
  if (!isSuccess(exit)) {
    console.error(exit);
    throw new Error('Expected exit to be a success.');
  }
}

function assertFailure<A, E>(
  exit: Exit.Exit<A, E>,
): asserts exit is Exit.Failure<A, E> {
  if (!isFailure(exit)) {
    console.error(exit);
    throw new Error('Expected exit to be a failure.');
  }
}

beforeEach<Context>(async (context) => {
  context.repo = await Repository.init();
  const env = makeTestEnv(context.repo.directory);

  context.effectValue = async (effect, config = {}) => {
    const layer = Layer.merge(
      Layer.setConfigProvider(ConfigProvider.fromJson(config)),
      env,
    );
    const program = effect.pipe(Effect.provide(layer));
    const result = await Effect.runPromiseExit(program);
    assertSuccess(result);
    return result.value;
  };

  context.effectError = async (effect, config = {}) => {
    const layer = Layer.merge(
      Layer.setConfigProvider(ConfigProvider.fromJson(config)),
      env,
    );
    const program = effect.pipe(Effect.provide(layer));
    const result = await Effect.runPromiseExit(program);
    assertFailure(result);
    return result.cause.toString();
  };
});

afterEach<Context>((context) => {
  context.repo.destroy();
});

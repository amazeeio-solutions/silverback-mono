import { HttpClient } from '@effect/platform';
import { NodeContext } from '@effect/platform-node';
import { program } from 'commander';
import { Effect, Layer } from 'effect';
import { isSuccess } from 'effect/Exit';

import { analyzeProject } from './effects/analyze.js';
import { estimate } from './effects/estimate.js';
import { writeHistory } from './effects/history.js';
import { scan } from './effects/scan.js';
import { score } from './effects/score.js';
import { update } from './effects/update.js';
import { ConfigFile, makeConfigFile } from './services/configfile.js';
import { Git, makeGit } from './services/git.js';
import { makeStorage, Storage } from './services/storage.js';

program.name('amazeelabs-estimator');

const config = Layer.effect(ConfigFile, makeConfigFile(process.cwd()));

const storage = Layer.effect(
  Storage,
  makeStorage.pipe(
    Effect.provide(config),
    Effect.provide(NodeContext.layer),
    Effect.provide(HttpClient.client.layer),
  ),
);

const git = Layer.effect(
  Git,
  makeGit.pipe(Effect.provide(config), Effect.provide(NodeContext.layer)),
);

const environment = Layer.mergeAll(config, NodeContext.layer, storage, git);

program.command('analyze').action(async () => {
  const result = await Effect.runPromiseExit(
    analyzeProject.pipe(Effect.provide(environment)),
  );
  if (isSuccess(result)) {
    console.log(result.value);
  } else {
    throw result.cause.toString();
  }
});

program.command('debug').action(async () => {
  const result = await Effect.runPromiseExit(
    scan.pipe(Effect.provide(environment)),
  );
  if (isSuccess(result)) {
    console.log(result.value);
  } else {
    throw result.cause.toString();
  }
});

program.command('score').action(async () => {
  const result = await Effect.runPromiseExit(
    Effect.gen(function* () {
      return yield* score(yield* analyzeProject);
    }).pipe(Effect.provide(environment)),
  );
  if (isSuccess(result)) {
    console.log(result.value);
  } else {
    throw result.cause.toString();
  }
});

program.command('write-history').action(async () => {
  const result = await Effect.runPromiseExit(
    writeHistory.pipe(Effect.provide(environment)),
  );

  if (isSuccess(result)) {
    console.log('History written');
  } else {
    throw result.cause.toString();
  }
});

program.command('estimate').action(async () => {
  const result = await Effect.runPromiseExit(
    estimate.pipe(Effect.provide(environment)),
  );

  if (isSuccess(result)) {
    const velocity =
      Math.floor(result.value.secondsPerPoint.valueOf() / 360) / 10;
    const diff = result.value.diff.valueOf();
    console.log(
      `${velocity * diff} hours (${diff} points at ${velocity} hours per point)`,
    );
  } else {
    throw result.cause.toString();
  }
});

program.command('update').action(async () => {
  const result = await Effect.runPromiseExit(
    update.pipe(Effect.provide(environment)),
  );

  if (isSuccess(result)) {
    console.log('Update successful');
  } else {
    throw result.cause.toString();
  }
});

program.parse();

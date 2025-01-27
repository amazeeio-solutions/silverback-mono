import { Effect } from 'effect';
import { glob } from 'glob';

import { configuration } from './configuration.js';

/**
 * Scans for relevant files based on the configuration.
 */
export const scan = Effect.gen(function* () {
  const config = yield* configuration;
  const resolvedCwd = config.root;

  let matches: string[] = [];

  for (const pattern of config.documents) {
    matches = matches.concat(
      yield* Effect.async<string[], Error>((resume) => {
        glob(pattern, {
          absolute: true,
          cwd: resolvedCwd,
        })
          .then((matches) => resume(Effect.succeed(matches)))
          .catch((err) => resume(Effect.fail(err)));
      }),
    );
  }
  return matches;
});

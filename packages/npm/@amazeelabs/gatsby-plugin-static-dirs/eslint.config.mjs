// @ts-expect-error There's no typing.
import { base, defineConfig } from '@internal/eslint-config';

export default defineConfig([
  ...base,
  {
    ignores: [],
  },
]);

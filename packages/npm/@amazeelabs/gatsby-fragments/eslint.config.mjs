import { base, defineConfig } from '@internal/eslint-config';

export default defineConfig([
  ...base,
  {
    ignores: ['index.cjs', 'tests/fragments/*.fragment.ts'],
  },
]);

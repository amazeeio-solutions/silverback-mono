import { base, defineConfig } from '@internal/eslint-config';

export default defineConfig([
  ...base,
  {
    ignores: ['lib/**'],
  },
]);

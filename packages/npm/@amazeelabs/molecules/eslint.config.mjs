import { defineConfig, frontend } from '@internal/eslint-config';

export default defineConfig([
  ...frontend,
  {
    ignores: ['dist/**', 'storybook-static/**'],
  },
]);

import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import { imagetools } from 'vite-imagetools';

const config: StorybookConfig = {
  async viteFinal(config) {
    // return the customized config
    return mergeConfig(config, {
      plugins: [imagetools()],
    });
  },
  stories: [
    '../src/docs/introduction.mdx',
    '../src/docs/**/*.mdx',
    '../src/components/*.stories.tsx',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-mdx-gfm',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  features: {
    storyStoreV7: true,
  },
  docs: {
    autodocs: true,
  },
};
export default config;

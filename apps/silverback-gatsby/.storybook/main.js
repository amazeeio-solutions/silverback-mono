module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  webpackFinal: async (config, { configType }) => {
    config.module.rules = config.module.rules.filter(
      (rule) => !rule.test.test('tailwind.css'),
    );
    // Compile tailwind on the fly.
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader', 'postcss-loader'],
    });
    return config;
  },
};

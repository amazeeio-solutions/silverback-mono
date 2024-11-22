import {
  PluginFunction,
  PluginValidateFn,
} from '@graphql-codegen/plugin-helpers';

import {
  generateAutoloader,
  printDrupalAutoload,
  printJsAutoload,
  printJSONAutoload,
} from './lib';

type Config = {
  context: Array<string>;
  mode: 'js' | 'drupal' | 'json';
};

export const validate: PluginValidateFn<Config> = (_, __, config) => {
  if (!config.context || !Array.isArray(config.context)) {
    throw new Error('Missing autoloader context.');
  }
};

const modes = {
  js: printJsAutoload,
  drupal: printDrupalAutoload,
  json: printJSONAutoload,
};

export const plugin: PluginFunction<Config> = (schema, _, config) =>
  generateAutoloader(schema, config.context, modes[config.mode]);

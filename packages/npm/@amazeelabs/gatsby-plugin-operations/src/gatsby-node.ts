import { transformSync } from '@babel/core';
import presetReact from '@babel/preset-react';
import presetTypescript from '@babel/preset-typescript';
import type { GatsbyNode } from 'gatsby';

import { initialize } from './graphql.js';
import babelPlugin from './plugin.js';

export const onCreateBabelConfig: GatsbyNode['onCreateBabelConfig'] = (
  { actions },
  options,
) => {
  // Inject the babel plugin into webpack.
  actions.setBabelPlugin({ name: require.resolve('./plugin'), options });
};

/**
 * Replace query id's with gatsby graphql`` tags before queries are collected.
 */
export const preprocessSource: GatsbyNode['preprocessSource'] = (
  { contents },
  options,
) => {
  const result = transformSync(contents, {
    plugins: [[babelPlugin, options]],
    presets: [
      presetReact,
      [presetTypescript, { isTSX: true, allExtensions: true }],
    ],
  });
  return result?.code ? result.code : contents;
};

/**
 * Make persisted queries and the graphql function globally
 * available.
 */
export const createPages: GatsbyNode['createPages'] = (
  { graphql },
  options,
) => {
  initialize(graphql, options.operations as string);
};

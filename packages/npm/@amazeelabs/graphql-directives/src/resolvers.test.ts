/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFileSync } from 'fs';
import { buildSchema, graphql, GraphQLFieldResolver } from 'graphql';
import { describe, expect, it } from 'vitest';

import {
  buildResolver,
  createResolveConfig,
  extractResolverMapping,
} from './resolvers';

const schema = buildSchema(
  readFileSync('./src/test/schema.graphql').toString(),
);

const echo: GraphQLFieldResolver<unknown, any, { msg: string }> = (
  _,
  { msg },
) => new Promise((resolve) => resolve(msg));

const resolveToNull: GraphQLFieldResolver<unknown, any, {}> = () =>
  new Promise((resolve) => resolve(null));

const throwIfCalled: GraphQLFieldResolver<unknown, any, {}> = () =>
  new Promise(() => {
    throw 'parent is undefined';
  });

describe('extractResolverMapping', () => {
  it('extracts fields with attached directives', () => {
    expect(extractResolverMapping(schema, { echo })).toEqual({
      Query: {
        value: [['echo', { msg: 'hardcoded' }]],
        argument: [['echo', { msg: '$msg' }]],
        parent: [
          ['echo', { msg: 'parent' }],
          ['echo', { msg: '$' }],
        ],
      },
    });
  });
});

describe('executeResolver', () => {
  it('executes a single resolver', async () => {
    const resolver = buildResolver([['echo', { msg: 'value from schema' }]], {
      echo,
    });
    expect(await resolver(undefined, {}, undefined, null as any)).toEqual(
      'value from schema',
    );
  });
  it('passes through the respective property of the parent value', async () => {
    const resolver = buildResolver([['echo', { msg: '$' }]], { echo });
    expect(
      await resolver({ p: 'parent value' }, {}, undefined, {
        fieldName: 'p',
      } as any),
    ).toEqual('parent value');
  });
  it('passes through the the parent value if it does not have the property', async () => {
    const resolver = buildResolver([['echo', { msg: '$' }]], { echo });
    expect(
      await resolver({ prop: 'parent value' }, {}, undefined, {
        fieldName: 'p',
      } as any),
    ).toEqual({ prop: 'parent value' });
  });
  it('passes through arguments', async () => {
    const resolver = buildResolver([['echo', { msg: '$msg' }]], { echo });
    expect(
      await resolver(
        undefined,
        { msg: 'argument value' },
        undefined,
        null as any,
      ),
    ).toEqual('argument value');
  });
  it('chains directives', async () => {
    const resolver = buildResolver(
      [
        ['echo', { msg: 'my value' }],
        ['echo', { msg: '$' }],
      ],
      { echo },
    );
    expect(await resolver(undefined, {}, undefined, null as any)).toEqual(
      'my value',
    );
  });

  it('aborts a chain on null', async () => {
    const resolver = buildResolver(
      [
        ['resolveToNull', {}],
        ['throwIfCalled', {}],
      ],
      { resolveToNull, throwIfCalled },
    );
    expect(await resolver(undefined, {}, undefined, null as any)).toEqual(null);
  });
});

describe('createResolveConfig', () => {
  it('creates a valid configuration', async () => {
    const config = createResolveConfig(
      readFileSync('./src/test/schema.graphql').toString(),
      { echo },
    );
    const source = `
    query {
      value
      argument(msg: "argument")
      parent
    }
    `;
    const result = await graphql({
      schema,
      source,
      contextValue: undefined,
      variableValues: {},
      fieldResolver: async (source, args, context, info) => {
        return config[info.parentType.name]?.[info.fieldName]
          ? config[info.parentType.name][info.fieldName](
              source,
              args,
              context,
              info,
            )
          : source[info.fieldName];
      },
    });

    expect(result.data).toEqual({
      value: 'hardcoded',
      argument: 'argument',
      parent: 'parent',
    });
  });
});

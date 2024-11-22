/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-function-type */

import type { GraphQLFieldResolver, GraphQLSchema } from 'graphql';
import { buildSchema, getArgumentValues, isObjectType } from 'graphql';
import { flow, isString } from 'lodash-es';

export function createResolveConfig(
  schema: GraphQLSchema | string,
  directives: Record<string, GraphQLFieldResolver<any, any>>,
  api?: any,
): Record<string, Record<string, GraphQLFieldResolver<any, any>>> {
  const mapping = extractResolverMapping(
    typeof schema === 'string' ? buildSchema(schema) : schema,
    directives,
  );
  const config: Record<
    string,
    Record<string, GraphQLFieldResolver<any, any>>
  > = {};
  Object.keys(mapping).forEach((type) => {
    if (!config[type]) {
      config[type] = {};
    }
    Object.keys(mapping[type]).forEach((field) => {
      config[type][field] = buildResolver(
        mapping[type][field],
        directives,
        api,
      );
    });
  });
  return config;
}

/**
 * Extract fields types with @resolveBy directives.
 *
 * Returns a nested map of type names, field names, package and function name tuples.
 */
export function extractResolverMapping(
  schema: GraphQLSchema,
  directives: Record<string, GraphQLFieldResolver<any, any>>,
) {
  const resolvers = {} as Record<
    string,
    Record<string, Array<[string, Record<string, unknown>]>>
  >;
  Object.values(schema.getTypeMap()).forEach((type) => {
    if (isObjectType(type)) {
      Object.values(type.getFields()).forEach((field) => {
        field.astNode?.directives?.forEach((dir) => {
          if (directives[dir.name.value]) {
            const directive = schema.getDirective(dir.name.value);
            if (directive) {
              if (!resolvers[type.name]) {
                resolvers[type.name] = {};
              }
              if (!resolvers[type.name][field.name]) {
                resolvers[type.name][field.name] = [] as Array<
                  [string, Record<string, unknown>]
                >;
              }
              resolvers[type.name][field.name].push([
                directive.name,
                getArgumentValues(directive, dir),
              ]);
            }
          }
        });
      });
    }
  });
  return resolvers;
}

export function buildResolver(
  config: Array<[string, Record<string, unknown>]>,
  directives: Record<string, Function>,
  api?: any,
): GraphQLFieldResolver<any, any> {
  return async (source, args, context, info) => {
    const fns = [
      (parent: any) => {
        if (parent && info) {
          if (Object.hasOwn(parent, info.fieldName)) {
            return parent?.[info?.fieldName];
          }
        }
        return parent;
      },
      ...config.map(([name, spec]) => {
        return async (parent: any) => {
          const value = await parent;
          if (value === null) {
            return null;
          }
          return directives[name](
            value,
            processDirectiveArguments(value, args, spec),
            {
              ...context,
              api,
            },
            info,
          );
        };
      }),
    ] as Array<Function>;
    const chain = flow(fns as any);
    return chain(source);
  };
}

export function processDirectiveArguments(
  parent: unknown,
  args: Record<string, any>,
  spec: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.keys(spec).map((key) => {
      const val = spec[key];
      if (isString(val)) {
        if (val === '$') {
          return [key, parent];
        }
        if (val.match(/^\$.+/)) {
          return [key, args[val.substr(1)]];
        }
      }
      return [key, spec[key]];
    }),
  );
}

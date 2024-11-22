import {
  getArgumentValues,
  GraphQLSchema,
  isInterfaceType,
  isObjectType,
  isUnionType,
  Kind,
  parse,
  print,
} from 'graphql';
import { omit } from 'lodash-es';

/**
 * Extract Object types with @sourceFrom directives.
 *
 * Returns a map of type names to source package and function name tuples.
 */
export function extractSourceMapping(schema: GraphQLSchema) {
  const sources = {} as Record<string, string>;
  const sourceFrom = schema.getDirective('sourceFrom');
  if (!sourceFrom) {
    return sources;
  }

  for (const type of Object.values(schema.getTypeMap())) {
    if (isObjectType(type)) {
      for (const directive of type.astNode?.directives || []) {
        if (directive.name.value === 'sourceFrom') {
          const values = getArgumentValues(sourceFrom, directive);
          sources[type.name] = values.fn as string;
        }
      }
    }
  }
  return sources;
}

/**
 * Extract a list of all object types that are queryable in Gatsby.
 * @param schema
 */
export function extractNodeTypes(schema: GraphQLSchema) {
  const sources = [] as string[];

  for (const type of Object.values(schema.getTypeMap())) {
    if (isObjectType(type)) {
      const interfaces = type.astNode?.interfaces?.map(
        (iface) => iface.name.value,
      );
      const directives = (type.astNode?.directives || [])
        .map((dir) => dir.name.value)
        .filter((dir) => dir !== 'type');
      const firstDefault = directives.indexOf('default');
      const relevantDirectives =
        firstDefault === -1 ? directives : directives.slice(0, firstDefault);
      if (relevantDirectives.length > 0 || interfaces?.length) {
        sources.push(type.name);
      }
    }
  }
  return sources;
}

/**
 * Extract a list of all union types.
 */
export function extractUnions(schema: GraphQLSchema) {
  return Object.values(schema.getTypeMap())
    .filter(isUnionType)
    .map((type) => type.name);
}

/**
 * Extract a list of all interface types.
 */
export function extractInterfaces(schema: GraphQLSchema) {
  return Object.values(schema.getTypeMap())
    .filter(isInterfaceType)
    .map((type) => type.name);
}

/**
 * Clean up a schema string and remove everything that could confuse Gatsby.
 */
export function cleanSchema(schema: string) {
  const ast = parse(schema);
  const result = [] as string[];
  ast.definitions.forEach((def) => {
    if (
      def.kind === Kind.SCHEMA_DEFINITION ||
      def.kind === Kind.DIRECTIVE_DEFINITION
    ) {
      return;
    } else if (
      def.kind === Kind.INTERFACE_TYPE_DEFINITION ||
      def.kind === Kind.OBJECT_TYPE_DEFINITION
    ) {
      const { ...altered } = omit(def, ['directives']);
      altered.fields = altered.fields?.map((field) =>
        omit(field, ['directives']),
      );
      result.push(print(altered));
    } else {
      const { ...altered } = def;
      result.push(print({ ...altered, directives: [] }));
    }
  });
  return result.join('\n');
}

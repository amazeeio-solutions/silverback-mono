import type { GraphQLSchema } from 'graphql';

/**
 * Extract all directive docstrings from a graphql schema.
 */
export const extractDocstrings = (
  schema: GraphQLSchema,
): Record<string, string> =>
  Object.fromEntries(
    schema
      .getDirectives()
      .map((dir) =>
        dir.astNode?.description?.value
          ? [dir.name, dir.astNode.description.value]
          : null,
      )
      .filter(<T>(val: T | null): val is T => !!val),
  );

/**
 * Extract all implementations from a docstring as a Record, keyed with the context.
 *
 * @param docstring The docstring to extract from.
 */
export const extractImplementations = (
  docstring: string,
): Record<string, string> =>
  Object.fromEntries(
    [
      ...docstring.matchAll(/^implementation(?:\(([^)]+)\))?:\s*([^\s]+)$/gm),
    ].map((match) => {
      const [, ctx, impl] = match;
      return [ctx ?? '', impl];
    }),
  );

/**
 * Generate all permutations for a given list of contexts, orderen by specificity.
 */
export const contextSuggestions = (contexts: Array<string>): Array<string> => {
  return contexts.length > 0
    ? [
        ...new Set([
          contexts.sort().join(':'),
          ...[...new Array(contexts.length)].flatMap((_, index) => {
            const copy = contexts.slice();
            copy.sort();
            copy.splice(index, 1);
            return contextSuggestions(copy);
          }),
        ]),
      ]
        .sort()
        .sort((a, b) => b.split(':').length - a.split(':').length)
    : [];
};

/**
 * Select the implementation for a given context or fall back to the default implementation.
 */
export const selectImplementation =
  (
    context: Array<string>,
  ): ((input: Record<string, string>) => string | undefined) =>
  (input) => {
    const implementations = Object.fromEntries(
      Object.keys(input).map((key) => [
        key.split(':').sort().join(':'),
        input[key],
      ]),
    );
    const suggestions = contextSuggestions(context);
    for (const suggestion of suggestions) {
      if (implementations[suggestion]) {
        return implementations[suggestion];
      }
    }
    return input[''];
  };

type JsImplementation = {
  package: string;
  export: string;
};

function parseJsImplementation(impl: string): JsImplementation | undefined {
  const [pkg, exp] = impl.split('#');
  if (pkg && exp) {
    return { package: pkg, export: exp };
  }
}

/**
 * Print an autoloader from a dictionary of implementations.
 */
export const printJsAutoload = (implementations: Record<string, string>) => {
  const jsImplementations = Object.keys(implementations)
    .map((directive) => {
      const impl = parseJsImplementation(implementations[directive]);
      return impl ? { name: directive, impl } : undefined;
    })
    .filter((dir): dir is { name: string; impl: JsImplementation } => !!dir);

  return [
    ...jsImplementations
      .map(
        ({ impl }, index) =>
          `import { ${impl.export} as al${index} } from "${impl.package}";`,
      )
      .filter((line) => !!line),
    'export default {',
    ...jsImplementations.map(
      (directive, index) => `  ${directive.name}: al${index},`,
    ),
    '};',
  ].join('\n');
};

export const printJSONAutoload = (implementations: Record<string, string>) => {
  return JSON.stringify(
    Object.fromEntries(
      Object.keys(implementations)
        .map((directive) => {
          const impl = parseJsImplementation(implementations[directive]);
          return impl ? [directive, impl] : undefined;
        })
        .filter((dir): dir is [string, JsImplementation] => !!dir),
    ),
    null,
    2,
  );
};

type DrupalImplementation =
  | {
      service: string;
      method: string;
    }
  | {
      class: string;
      method: string;
    };

function parseDrupalImplementation(
  impl: string,
): DrupalImplementation | undefined {
  const [srvc, func] = impl.split('::');
  if (srvc && func) {
    if (srvc.startsWith('\\')) {
      return { class: srvc, method: func };
    } else {
      return { service: srvc, method: func };
    }
  }
}

/**
 * Print an autoloader from a dictionary of implementations.
 */
export const printDrupalAutoload = (
  implementations: Record<string, string>,
) => {
  return JSON.stringify(
    Object.fromEntries(
      Object.keys(implementations)
        .map((directive) => {
          const impl = parseDrupalImplementation(implementations[directive]);
          return impl ? [directive, impl] : undefined;
        })
        .filter((dir): dir is [string, DrupalImplementation] => !!dir),
    ),
    null,
    2,
  );
};

/**
 * Generate an autoloader from a graphql schema and a given context.
 */
export const generateAutoloader = (
  schema: GraphQLSchema,
  context: Array<string>,
  printer: (input: Record<string, string>) => string,
): string => {
  const docstrings = extractDocstrings(schema);
  const selector = selectImplementation(context);
  return printer(
    Object.fromEntries(
      Object.keys(docstrings)
        .map((directive) => {
          const implementation = selector(
            extractImplementations(docstrings[directive]),
          );
          return implementation ? [directive, implementation] : undefined;
        })
        .filter((v): v is [string, string] => Array.isArray(v)),
    ),
  );
};

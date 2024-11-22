import { readFileSync } from 'fs';
import type { CreatePagesArgs } from 'gatsby';

export let _graphql: CreatePagesArgs['graphql'] | undefined = undefined;
let _operations: Record<string, string> | undefined = undefined;

/**
 * Initialize the library. Happens in `./gatsby-node.ts`
 */
export function initialize(
  graphql: CreatePagesArgs['graphql'],
  operations: string,
) {
  _graphql = graphql;
  _operations = JSON.parse(readFileSync(operations).toString());
}

/**
 * Execute a graphql query against gatsby.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function graphqlQuery(id: string, vars?: any): any {
  if (!_graphql || !_operations) {
    throw new Error(
      'Plugin "@amazeelabs/gatsby-plugin-operations" not available. Make sure its configured in "gatsby-config.mjs" and that "graphqlQuery" is used within "createPages" only.',
    );
  }
  const operation = _operations?.[id];
  return _graphql(operation, vars);
}

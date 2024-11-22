import { createHash } from 'crypto';
import fetchBuilder from 'fetch-retry';
import { writeFileSync } from 'fs';
import { wrapQueryExecutorWithQueue } from 'gatsby-graphql-source-toolkit';
import { IQueryExecutor } from 'gatsby-graphql-source-toolkit/dist/types';
import fetch from 'isomorphic-fetch';
import timeoutSignal from 'timeout-signal';
import { inspect } from 'util';

import { Options } from '../utils.js';

const fetchWithRetries = fetchBuilder(fetch);

export const createQueryExecutor = (
  options: Options & {
    headers?: RequestInit['headers'];
  },
) => {
  if (!options.drupal_url) {
    throw "No Drupal Url defined. Can't instantiate query executor.";
  }
  const url = `${new URL(options.drupal_url).origin}${options.graphql_path}`;
  const executor = createNetworkQueryExecutor(
    url,
    {
      headers: {
        ...options?.headers,
        ...(options?.auth_user && options?.auth_pass
          ? {
              Authorization: `Basic ${Buffer.from(
                `${options.auth_user}:${options.auth_pass}`,
              ).toString('base64')}`,
            }
          : {}),
        ...(options?.auth_key ? { 'api-key': options.auth_key } : {}),
      },
    },
    options.request_timeout,
  );
  return wrapQueryExecutorWithQueue(executor, {
    concurrency: options.query_concurrency || 10,
  });
};

// Copy of the default network query executor from gatsby-graphql-source-toolkit
// package with improved error handling.
// https://github.com/gatsbyjs/gatsby-graphql-toolkit/blob/7ba8b24d8524254dc6c2853d6d014070befd9aea/src/config/query-executor.ts#L6-L39
export function createNetworkQueryExecutor(
  uri: string,
  fetchOptions: RequestInit = {},
  timeout = 60_000,
): IQueryExecutor {
  return async function execute(args) {
    const { query, variables, operationName } = args;

    let response;
    const signal = timeoutSignal(timeout);
    signal.onabort = () =>
      console.error(
        `Query ${operationName} aborted due to a timeout of ${timeout}ms\n` +
          `Query variables: ${inspect(variables)}\n` +
          `Full query: ${logQuery(query)}\n`,
      );
    try {
      response = await fetchWithRetries(uri, {
        method: 'POST',
        body: JSON.stringify({ query, variables, operationName }),
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
        signal,
      });
      signal.onabort = null;
    } catch (e) {
      console.error(
        `Query ${operationName} failed: ${e}\n` +
          `Query variables: ${inspect(variables)}\n` +
          `Full query: ${logQuery(query)}\n`,
      );
      throw e;
    }
    if (!response.ok) {
      console.warn(
        `Query ${operationName} returned status ${response.status}.\n` +
          `Query variables: ${inspect(variables)}\n` +
          `Full query: ${logQuery(query)}\n`,
      );
    }
    const result = await response.json();

    if (result.data && result.errors?.length) {
      console.warn(
        `Query ${operationName} returned warnings:\n` +
          `${inspect(result.errors)}\n` +
          `Query variables: ${inspect(variables)}\n` +
          `Full query: ${logQuery(query)}\n`,
      );
    }
    return result;
  };
}

const logQuery = (query: string): string => {
  const hash = createHash('md5').update(query).digest('hex');
  const filename = `/tmp/gatsby-source-silverback--failed-query--${hash}.txt`;
  try {
    writeFileSync(filename, query);
    return filename;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return '[could not store query as file]';
  }
};

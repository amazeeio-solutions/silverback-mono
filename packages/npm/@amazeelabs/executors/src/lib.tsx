import {
  AnyOperationId,
  OperationVariables,
} from '@amazeelabs/codegen-operation-ids';
import { isMatch } from 'lodash-es';

import { Executor, RegistryEntry } from './types.js';

type VariablesMatcher =
  | Record<string, unknown>
  | ((vars: Record<string, unknown>) => boolean);

export function mergeExecutors(
  oldExecutors: RegistryEntry[],
  newExecutors: RegistryEntry[],
): RegistryEntry[] {
  return [...oldExecutors, ...newExecutors];
}

export function matchVariables(
  matcher: VariablesMatcher | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables: any,
) {
  if (typeof matcher === 'undefined') {
    return true;
  }
  if (typeof matcher === 'function') {
    return matcher(variables);
  }
  return isMatch(variables, matcher);
}

function formatEntry(id: string | undefined, variables?: unknown) {
  return `${id ? id : '*'}:${variables ? JSON.stringify(variables) : '*'}`;
}

export function findExecutors<TOperation extends AnyOperationId>(
  registry: RegistryEntry[],
  id: TOperation,
  variables: OperationVariables<TOperation>,
): Array<Executor<TOperation>> {
  return registry
    .filter(
      (entry) =>
        (id === entry.id || entry.id === undefined) &&
        matchVariables(entry.variables, variables),
    )
    .map((entry) => entry.executor);
}

export function findExecutor<TOperation extends AnyOperationId>(
  registry: RegistryEntry[],
  id: TOperation,
  variables: OperationVariables<TOperation>,
): Executor<TOperation> {
  const result = findExecutors(registry, id, variables);
  if (result.length > 0) {
    return result.pop();
  }
  throw new ExecutorRegistryError(registry, id, variables);
}

export class ExecutorRegistryError extends Error {
  constructor(
    registry: RegistryEntry[],
    id: AnyOperationId,
    variables?: unknown,
  ) {
    const candidates = registry.filter((entry) => id === entry.id);
    const candidatesMessage =
      candidates.length > 0
        ? [
            'Candidates:',
            ...candidates.map(({ id, variables }) =>
              formatEntry(id, variables),
            ),
          ]
        : [];
    super(
      [
        'No executor found for:',
        formatEntry(id, variables),
        ...candidatesMessage,
      ].join(' '),
    );
    this.name = 'ExecutorRegistryError';
  }
}

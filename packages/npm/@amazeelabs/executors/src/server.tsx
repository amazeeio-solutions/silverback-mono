import {
  AnyOperationId,
  OperationResult,
  OperationVariables,
} from '@amazeelabs/codegen-operation-ids';
import { cache } from 'react';

import type {
  Operation as ComponentType,
  OperationExecutorsProvider as ProviderType,
  useAllOperationExecutors as AllHookType,
  useOperationExecutor as HookType,
} from './interface.js';
import { findExecutor, findExecutors, mergeExecutors } from './lib.js';
import type {
  ExecutorFunction,
  OperationProps,
  RegistryEntry,
} from './types.js';

export { findExecutor, findExecutors } from './lib.js';

function serverContext<T>(defaultValue: T): [() => T, (v: T) => void] {
  const getRef = cache(() => ({ current: defaultValue }));

  const getValue = (): T => getRef().current;

  const setValue = (value: T) => {
    getRef().current = value;
  };

  return [getValue, setValue];
}

const [getRegistry, setRegistry] = serverContext<
  RegistryEntry<AnyOperationId>[]
>([]);

export const OperationExecutorsProvider: ProviderType = ({
  children,
  executors,
}) => {
  const registry = getRegistry();
  setRegistry(mergeExecutors(registry, executors));
  return <>{children}</>;
};

export const useOperationExecutor: HookType = <
  TOperation extends AnyOperationId,
>(
  id: TOperation,
  variables: OperationVariables<TOperation>,
): ExecutorFunction<TOperation> => {
  return findExecutor(getRegistry(), id, variables);
};

export const useAllOperationExecutors: AllHookType = <
  TOperation extends AnyOperationId,
>(
  id: TOperation,
  variables: OperationVariables<TOperation>,
): Array<ExecutorFunction<TOperation>> => {
  return findExecutors(getRegistry(), id, variables);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Promisify<T extends (...args: any) => any> = (
  ...args: Parameters<T>
) => Promise<ReturnType<T>>;

type ServerComponentType = Promisify<ComponentType>;

export const Operation: ComponentType = (async <
  TOperation extends AnyOperationId,
>({
  id,
  variables,
  children,
  all,
}: OperationProps<TOperation>) => {
  try {
    const executors = all
      ? findExecutors(getRegistry(), id, variables)
      : [findExecutor(getRegistry(), id, variables)];
    const results = await Promise.all(
      executors.map((exec) =>
        exec instanceof Function ? exec(id, variables) : exec,
      ),
    );
    if (all) {
      return (
        <>
          {children({
            state: 'success',
            data: results as OperationResult<TOperation>,
          })}
        </>
      );
    } else {
      return <>{children({ state: 'success', data: results[0] })}</>;
    }
  } catch (error) {
    return <>{children({ state: 'error', error })}</>;
  }
}) satisfies ServerComponentType as unknown as ComponentType;

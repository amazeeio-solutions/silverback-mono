import type {
  AnyOperationId,
  OperationVariables,
} from '@amazeelabs/codegen-operation-ids';
import type { PropsWithChildren, ReactElement } from 'react';

import type {
  Executor,
  ExecutorFunction,
  OperationProps,
  RegistryEntry,
} from './types';

export type { RegistryEntry } from './types';

export type Operation = <TOperation extends AnyOperationId>(
  props: OperationProps<TOperation>,
) => ReactElement;

export type useOperationExecutor = <TOperation extends AnyOperationId>(
  id: TOperation,
  variables?: OperationVariables<TOperation>,
) => Executor<TOperation>;

export type useAllOperationExecutors = <TOperation extends AnyOperationId>(
  id: TOperation,
  variables?: OperationVariables<TOperation>,
) => Array<ExecutorFunction<TOperation>>;

export type OperationExecutorsProvider = (
  props: PropsWithChildren<{ executors: Array<RegistryEntry<AnyOperationId>> }>,
) => ReactElement;

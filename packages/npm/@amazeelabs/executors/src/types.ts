import type {
  AnyOperationId,
  OperationId,
  OperationResult,
  OperationVariables,
} from '@amazeelabs/codegen-operation-ids';
import type { ReactNode } from 'react';
import { expectType } from 'ts-expect';

type TestWithVariables = OperationId<{ hasVariables: true }, { a: string }>;
type TestWithoutVariables = OperationId<
  { hasVariables: false },
  { [key: string]: never } | undefined
>;

export type ExecutorFunction<TOperation extends AnyOperationId> = (
  variables: OperationVariables<TOperation>,
) => Promise<OperationResult<TOperation>>;

export type Executor<TOperation extends AnyOperationId> =
  | OperationResult<TOperation>
  | ((
      id: TOperation,
      variables: OperationVariables<TOperation>,
    ) => Promise<OperationResult<TOperation>>);

type ExecutorWithVariables = Executor<TestWithVariables>;
type ExecutorWithoutVariables = Executor<TestWithoutVariables>;

expectType<ExecutorWithVariables>({ hasVariables: true });
expectType<ExecutorWithVariables>(
  (id: TestWithVariables, variables: { a: string }) =>
    new Promise(() => ({ hasVariables: true, id, variables })),
);

expectType<ExecutorWithoutVariables>({ hasVariables: false });
expectType<ExecutorWithoutVariables>(
  (id: TestWithoutVariables) =>
    new Promise(() => ({ hasVariables: false, id })),
);

type VariablesMatcher<TOperation extends AnyOperationId> =
  | OperationVariables<TOperation>
  | ((vars: OperationVariables<TOperation>) => boolean);

expectType<VariablesMatcher<TestWithVariables>>({ a: 'string' });
expectType<VariablesMatcher<TestWithVariables>>(
  (vars: { a: string }) => !!vars,
);

expectType<VariablesMatcher<TestWithoutVariables>>({});

export type RegistryEntry<TOperation extends AnyOperationId = AnyOperationId> =
  {
    executor: Executor<TOperation>;
    id?: TOperation;
    variables?: VariablesMatcher<TOperation>;
  };

type RegistryEntryWithVariables = RegistryEntry<TestWithVariables>;
type RegistryEntryWithoutVariables = RegistryEntry<TestWithoutVariables>;
expectType<RegistryEntryWithVariables>({
  id: '' as TestWithVariables,
  executor: { hasVariables: true },
  variables: { a: 'string' },
});

expectType<RegistryEntryWithoutVariables>({
  id: '' as TestWithoutVariables,
  executor: { hasVariables: false },
});

export type ExecutionState<T> =
  | {
      state: 'loading';
    }
  | {
      state: 'error';
      error: unknown;
    }
  | {
      state: 'success';
      data: T;
    };

export type OperationProps<TOperation extends AnyOperationId> = (
  | {
      id: TOperation;
      children: (
        props: ExecutionState<OperationResult<TOperation>>,
      ) => ReactNode;
      all?: false | undefined;
    }
  | {
      id: TOperation;
      children: (
        props: ExecutionState<Array<OperationResult<TOperation>>>,
      ) => ReactNode;
      all: true;
    }
) &
  (undefined extends OperationVariables<TOperation>
    ? {
        variables?: never;
      }
    : {
        variables: OperationVariables<TOperation>;
      });

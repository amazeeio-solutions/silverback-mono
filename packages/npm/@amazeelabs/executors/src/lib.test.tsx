// @vitest-environment jsdom

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AnyOperationId, OperationId } from '@amazeelabs/codegen-operation-ids';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { PropsWithChildren, useState } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';

import {
  OperationExecutorsProvider,
  useAllOperationExecutors,
  useOperationExecutor,
} from './client';

beforeEach(cleanup);

function Consumer({
  id,
  variables,
}: {
  id: string;
  variables?: Record<string, any>;
}) {
  const executor = useOperationExecutor(id as AnyOperationId, variables);
  return (
    <p>{typeof executor === 'function' ? executor(variables) : executor}</p>
  );
}

function MultiConsumer({
  id,
  variables,
}: {
  id: string;
  variables?: Record<string, any>;
}) {
  const executors = useAllOperationExecutors(id as AnyOperationId, variables);
  return executors.length === 0 ? (
    <p>No results</p>
  ) : (
    executors.map((executor, index) => (
      <p key={index}>
        {typeof executor === 'function' ? executor(variables) : executor}
      </p>
    ))
  );
}

test('no operator', () => {
  expect(() => render(<Consumer id={'unknown'} />)).toThrow();
});

test('global default operator', () => {
  expect(() =>
    render(
      <OperationExecutorsProvider executors={[{ executor: () => 'default' }]}>
        <Consumer id={'unknown'} />
      </OperationExecutorsProvider>,
    ),
  ).not.toThrow();
  expect(screen.getByText('default')).toBeDefined();
});

test('global default operator with arguments', () => {
  expect(() =>
    render(
      <OperationExecutorsProvider
        executors={[{ executor: (_: any, vars: any) => vars.foo }]}
      >
        <Consumer id={'unknown'} variables={{ foo: 'bar' }} />
      </OperationExecutorsProvider>,
    ),
  ).not.toThrow();
  expect(screen.getByText('bar')).toBeDefined();
});

test('operation default operator', () => {
  expect(() =>
    render(
      <OperationExecutorsProvider
        executors={[
          {
            id: 'a' as OperationId<string, never>,
            executor: () => 'operation a',
          },
        ]}
      >
        <Consumer id={'a'} />
      </OperationExecutorsProvider>,
    ),
  ).not.toThrow();

  expect(screen.getByText('operation a')).toBeDefined();
});

test('operation default operator with arguments', () => {
  expect(() =>
    render(
      <OperationExecutorsProvider
        executors={[
          {
            id: 'a' as OperationId<string, never>,
            executor: (_: any, vars: any) => vars.foo,
          },
        ]}
      >
        <Consumer id={'a'} variables={{ foo: 'bar' }} />
      </OperationExecutorsProvider>,
    ),
  ).not.toThrow();
  expect(screen.getByText('bar')).toBeDefined();
});

test('structural argument matching', () => {
  const id = 'x' as AnyOperationId;
  const a = vi.fn();
  const b = vi.fn();
  const c = vi.fn();

  expect(() =>
    render(
      <OperationExecutorsProvider
        executors={[
          { id, executor: a, variables: { y: 1 } },
          { id, executor: b, variables: { y: 2 } },
          { id, executor: c, variables: { y: 1, z: 1 } },
        ]}
      >
        <Consumer id={id} variables={{ y: 1, z: 1 }} />
        <Consumer id={id} variables={{ y: 1 }} />
        <Consumer id={id} variables={{ y: 2 }} />
      </OperationExecutorsProvider>,
    ),
  ).not.toThrow();

  expect(a).toHaveBeenCalledOnce();
  expect(a).toHaveBeenCalledWith(id, { y: 1 });
  expect(b).toHaveBeenCalledOnce();
  expect(b).toHaveBeenCalledWith(id, { y: 2 });
  expect(c).toHaveBeenCalledOnce();
  expect(c).toHaveBeenCalledWith(id, { y: 1, z: 1 });
});

test('functional argument matching', () => {
  const id = 'x' as AnyOperationId;
  const a = vi.fn();
  const b = vi.fn();
  const c = vi.fn();

  expect(() =>
    render(
      <OperationExecutorsProvider
        executors={[
          { id, executor: a, variables: () => false },
          { id, executor: b, variables: () => false },
          { id, executor: c, variables: () => true },
        ]}
      >
        <Consumer id={id} variables={{ y: 1, z: 1 }} />
        <Consumer id={id} variables={{ y: 1 }} />
        <Consumer id={id} variables={{ y: 2 }} />
      </OperationExecutorsProvider>,
    ),
  ).not.toThrow();

  expect(a).not.toHaveBeenCalled();
  expect(b).not.toHaveBeenCalled();
  expect(c).toHaveBeenCalledTimes(3);
  expect(c).toHaveBeenCalledWith(id, { y: 1, z: 1 });
  expect(c).toHaveBeenCalledWith(id, { y: 1 });
  expect(c).toHaveBeenCalledWith(id, { y: 2 });
});

test('structural argument mismatch', () => {
  const id = 'x' as AnyOperationId;
  const a = vi.fn();
  const b = vi.fn();
  const c = vi.fn();

  expect(() =>
    render(
      <OperationExecutorsProvider
        executors={[
          { id, executor: a, variables: { y: 1 } },
          { id, executor: b, variables: { y: 2 } },
          { id, executor: c, variables: { y: 1, z: 1 } },
        ]}
      >
        <Consumer id={id} variables={{ y: 3 }} />
      </OperationExecutorsProvider>,
    ),
  ).toThrow(
    'No executor found for: x:{"y":3} Candidates: x:{"y":1} x:{"y":2} x:{"y":1,"z":1}',
  );
});

test('static data resolution', () => {
  const id = 'x' as AnyOperationId;

  expect(() =>
    render(
      <OperationExecutorsProvider executors={[{ id, executor: 'static data' }]}>
        <Consumer id={id} />
      </OperationExecutorsProvider>,
    ),
  ).not.toThrow();
  expect(screen.getByText('static data')).toBeDefined();
});

test('static data resolution with arguments', () => {
  const id = 'x' as AnyOperationId;

  expect(() =>
    render(
      <OperationExecutorsProvider
        executors={[{ id, executor: 'static data', variables: { y: 1 } }]}
      >
        <Consumer id={id} variables={{ y: 1 }} />
      </OperationExecutorsProvider>,
    ),
  ).not.toThrow();
  expect(screen.getByText('static data')).toBeDefined();
});

test('static data updates', () => {
  const id = 'x' as AnyOperationId;

  function Executor({ children }: PropsWithChildren) {
    const [count, setCount] = useState(0);
    return (
      <>
        <button onClick={() => setCount(count + 1)}>Up</button>
        <OperationExecutorsProvider
          executors={[{ id, executor: count, variables: { y: 1 } }]}
        >
          {children}
        </OperationExecutorsProvider>
      </>
    );
  }

  expect(() =>
    render(
      <Executor>
        <Consumer id={id} variables={{ y: 1 }} />
      </Executor>,
    ),
  ).not.toThrow();

  expect(screen.getByText(0)).toBeDefined();

  act(() => {
    fireEvent.click(screen.getByText(/Up/));
  });

  expect(screen.getByText(1)).toBeDefined();
});

test('fallback to functional', () => {
  const id = 'x' as AnyOperationId;

  expect(() =>
    render(
      <OperationExecutorsProvider
        executors={[
          { id, executor: () => 'global' },
          { id, executor: () => 'functional', variables: () => true },
          { id, executor: () => 'structural', variables: { foo: 'bar' } },
        ]}
      >
        <Consumer id={id} variables={{ foo: 'baz' }} />
      </OperationExecutorsProvider>,
    ),
  ).not.toThrow();
  expect(screen.getByText('functional')).toBeDefined();
});

test('fallback to global', () => {
  const id = 'x' as AnyOperationId;

  expect(() =>
    render(
      <OperationExecutorsProvider
        executors={[
          { id, executor: () => 'global' },
          { id, executor: () => 'functional', variables: () => false },
          { id, executor: () => 'structural', variables: { foo: 'bar' } },
        ]}
      >
        <Consumer id={id} variables={{ foo: 'baz' }} />
      </OperationExecutorsProvider>,
    ),
  ).not.toThrow();
  expect(screen.getByText('global')).toBeDefined();
});

test('multi without match', () => {
  const id = 'x' as AnyOperationId;
  expect(() =>
    render(
      <OperationExecutorsProvider
        executors={[
          { id, executor: () => 'functional', variables: () => false },
          { id, executor: () => 'structural', variables: { foo: 'bar' } },
        ]}
      >
        <MultiConsumer id={id} variables={{ foo: 'baz' }} />
      </OperationExecutorsProvider>,
    ),
  ).not.toThrow();
  expect(screen.getByText('No results')).toBeDefined();
});

test('multi with matches', () => {
  const id = 'x' as AnyOperationId;
  expect(() =>
    render(
      <OperationExecutorsProvider
        executors={[
          { id, executor: () => 'functional', variables: () => true },
          { id, executor: () => 'structural', variables: { foo: 'bar' } },
        ]}
      >
        <MultiConsumer id={id} variables={{ foo: 'bar' }} />
      </OperationExecutorsProvider>,
    ),
  ).not.toThrow();
  expect(screen.getByText('functional')).toBeDefined();
  expect(screen.getByText('structural')).toBeDefined();
});

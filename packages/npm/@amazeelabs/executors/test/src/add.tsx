import type { OperationId } from '@amazeelabs/codegen-operation-ids';

import type {
  Operation as ComponentType,
  OperationExecutorsProvider as ProviderType,
} from '../../src/interface.js';
import type { RegistryEntry } from '../../src/types.js';

export const AddOperation = 'add_two_numbers' as OperationId<
  { result: number },
  { a: number; b: number }
>;

export const NumberOperation = 'retrieve_a_number' as OperationId<
  number,
  undefined
>;

async function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export const HardcodedAdd: RegistryEntry<typeof AddOperation> = {
  id: AddOperation,
  executor: { result: 3 },
  variables: { a: 1, b: 2 },
};

export const ErrorAdd: RegistryEntry<typeof AddOperation> = {
  id: AddOperation,
  executor: async () => {
    throw 'I dont like 6es!';
  },
  variables: function Sixes({ a, b }) {
    return a === 6 && b === 6;
  },
};

export const DelayedErrorAdd: RegistryEntry<typeof AddOperation> = {
  id: AddOperation,
  executor: async () => {
    await sleep(1000);
    throw 'I dont like 7s!';
  },
  variables: function Sevens({ a, b }) {
    return a === 7 && b === 7;
  },
};

export const DelayedAdd: RegistryEntry<typeof AddOperation> = {
  id: AddOperation,
  executor: async (_, { a, b }) => {
    await sleep(1000);
    return { result: a + b };
  },
};

const StaticNumber: RegistryEntry<typeof NumberOperation> = {
  id: NumberOperation,
  executor: 1,
};

const DynamicNumber: RegistryEntry<typeof NumberOperation> = {
  id: NumberOperation,
  executor: async () => 1 + 1,
};

const DelayedNumber: RegistryEntry<typeof NumberOperation> = {
  id: NumberOperation,
  executor: async () => {
    await sleep(1000);
    return 3;
  },
};

export function Calc({
  label,
  a,
  b,
  Operation,
}: {
  label: string;
  a: number;
  b: number;
  Operation: ComponentType;
}) {
  return (
    <Operation id={AddOperation} variables={{ a, b }}>
      {(props) => {
        if (props.state === 'error') {
          return <p data-testid={label}>Error: {`${props.error}`}</p>;
        }
        return (
          <p data-testid={label}>
            {label}: {a} + {b} ={' '}
            {props.state === 'loading' ? '...' : props.data.result}
          </p>
        );
      }}
    </Operation>
  );
}

function Sum({ Operation }: { Operation: ComponentType }) {
  const label = 'Sum';
  return (
    <Operation id={NumberOperation} all={true}>
      {(props) => {
        if (props.state === 'loading') {
          return <p data-testid={label}>Loading...</p>;
        }
        if (props.state === 'error') {
          return <p data-testid={label}>Error: {`${props.error}`}</p>;
        }
        return (
          <p data-testid={label}>
            {label}: {props.data.reduce((a, b) => a + b, 0)}
          </p>
        );
      }}
    </Operation>
  );
}

export function TestComponent({
  label,
  OperationExecutorsProvider,
  Operation,
}: {
  label: string;
  OperationExecutorsProvider: ProviderType;
  Operation: ComponentType;
}) {
  return (
    <OperationExecutorsProvider
      executors={[
        DelayedAdd,
        HardcodedAdd,
        ErrorAdd,
        DelayedErrorAdd,
        StaticNumber,
        DynamicNumber,
        DelayedNumber,
      ]}
    >
      <h1>{label}</h1>
      <Calc label="Hardcoded" a={1} b={2} Operation={Operation} />
      <Calc label="Delayed" a={2} b={3} Operation={Operation} />
      <Calc label="Error" a={6} b={6} Operation={Operation} />
      <Calc label="DelayedError" a={7} b={7} Operation={Operation} />
      <Sum Operation={Operation} />
    </OperationExecutorsProvider>
  );
}

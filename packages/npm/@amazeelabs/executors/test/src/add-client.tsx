'use client';
import { useEffect, useState } from 'react';

import { Operation, OperationExecutorsProvider } from '../../src/client.js';
import { Calc, DelayedAdd, TestComponent } from './add.js';

function CountUp() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(count + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [count, setCount]);
  return <Calc label={'Count'} a={count} b={0} Operation={Operation} />;
}

export const Add = () => (
  <>
    <TestComponent
      label={'Client'}
      OperationExecutorsProvider={OperationExecutorsProvider}
      Operation={Operation}
    />
    <OperationExecutorsProvider executors={[DelayedAdd]}>
      <CountUp />
    </OperationExecutorsProvider>
  </>
);

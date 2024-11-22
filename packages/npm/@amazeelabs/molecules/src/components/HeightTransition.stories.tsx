import { Disclosure, Transition } from '@headlessui/react';
import { Meta } from '@storybook/react';
import { useState } from 'react';

import { HeightTransition } from './HeightTransition';

export default {
  title: 'Components/HeightTransition',
  component: HeightTransition,
} as Meta<typeof HeightTransition>;

const content = (
  <div className={'bg-indigo-200 p-2 text-lg'}>
    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
    tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
    quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
    consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
    cillum dolore eu fugiat nulla pariatur
  </div>
);

export function Open() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div className="bg-green-100 p-2">
        <button onClick={() => setOpen(!open)}>Toggle</button>
        <HeightTransition show={open}>{content}</HeightTransition>
      </div>
    </>
  );
}

export function Closed() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)}>Toggle</button>
      <HeightTransition show={open}>{content}</HeightTransition>
    </>
  );
}

export function Multiple() {
  const [openA, setOpenA] = useState(false);
  const [openB, setOpenB] = useState(true);
  return (
    <>
      <div>
        <button onClick={() => setOpenA(!openA)}>Toggle</button>
        <HeightTransition show={openA}>{content}</HeightTransition>
      </div>
      <div>
        <button onClick={() => setOpenB(!openB)}>Toggle</button>
        <HeightTransition show={openB}>{content}</HeightTransition>
      </div>
    </>
  );
}

export function Delayed() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)}>Toggle</button>
      <HeightTransition show={open} delayEnter={1} delayLeave={1}>
        {content}
      </HeightTransition>
    </>
  );
}

export function HeadlessUIDisclosure() {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button>Toggle</Disclosure.Button>
          <HeightTransition show={open}>
            <Disclosure.Panel static>{content}</Disclosure.Panel>
          </HeightTransition>
        </>
      )}
    </Disclosure>
  );
}

export function Coordinated() {
  return (
    <Disclosure>
      {({ open }) => (
        <div className={'bg-indigo-200'}>
          <Disclosure.Button>Toggle</Disclosure.Button>
          <HeightTransition show={open} delayLeave={1}>
            <Transition
              show={open}
              enter="transition duration-1000 ease-out delay-1000"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition duration-1000 ease-out"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Disclosure.Panel static>{content}</Disclosure.Panel>
            </Transition>
          </HeightTransition>
        </div>
      )}
    </Disclosure>
  );
}

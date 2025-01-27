import { Transition } from '@headlessui/react';
import React, { PropsWithChildren, useEffect, useRef } from 'react';

function HeightTransition({
  beforeEnter,
  afterEnter,
  beforeLeave,
  afterLeave,
  children,
  show,
  duration,
  delay,
}: PropsWithChildren<{
  show?: boolean;
  duration: number;
  delay: number;
  beforeEnter?: () => void;
  afterEnter?: () => void;
  beforeLeave?: () => void;
  afterLeave?: () => void;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current?.parentElement) {
      ref.current.parentElement.style.height = `${ref.current.offsetHeight}px`;
    }
  }, [ref]);
  return (
    <Transition
      show={show}
      enterFrom="!h-0"
      leaveTo="!h-0"
      beforeEnter={() => {
        if (ref.current?.parentElement) {
          ref.current.parentElement.style.height = `${ref.current.offsetHeight}px`;
        }
        beforeEnter?.();
      }}
      afterEnter={() => {
        if (ref.current?.parentElement) {
          ref.current.parentElement.style.height = `auto`;
        }
        afterEnter?.();
      }}
      beforeLeave={() => {
        if (ref.current?.parentElement) {
          ref.current.parentElement.style.height = `${ref.current.offsetHeight}px`;
        }
        beforeLeave?.();
      }}
      afterLeave={() => {
        if (ref.current?.parentElement) {
          ref.current.parentElement.style.height = `auto`;
        }
        afterLeave?.();
      }}
    >
      <div
        style={{
          transitionProperty: 'height',
          transitionDuration: `${duration}ms`,
          transitionDelay: `${delay}ms`,
          transitionTimingFunction: 'ease-in-out',
        }}
      >
        <div ref={ref}>{children}</div>
      </div>
    </Transition>
  );
}

export default function Collapsible({
  children,
  show,
  fadeDuration,
  scaleDuration,
  delay,
  ...rest
}: PropsWithChildren<{
  show: boolean;
  beforeEnter?: () => void;
  afterEnter?: () => void;
  beforeLeave?: () => void;
  afterLeave?: () => void;
  delay: number;
  fadeDuration: number;
  scaleDuration: number;
}>) {
  return (
    <div
      style={{
        transitionProperty: 'opacity',
        transitionDuration: `${fadeDuration}ms`,
        transitionDelay: show ? `${scaleDuration + delay}ms` : `${delay}ms`,
        opacity: show ? 1 : 0,
      }}
    >
      <HeightTransition
        show={show}
        duration={scaleDuration}
        delay={!show ? fadeDuration + delay : delay}
        {...rest}
      >
        {children}
      </HeightTransition>
    </div>
  );
}

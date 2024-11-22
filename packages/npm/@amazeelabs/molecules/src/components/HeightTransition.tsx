import gsap from 'gsap';
import {
  memo,
  MutableRefObject,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import { createStore, StoreApi } from 'zustand';

type HeightTransitionStore = {
  initialState?: boolean;
  el?: HTMLDivElement;
  tween?: gsap.core.Timeline;
  animate: (reverse: boolean) => gsap.core.Timeline | undefined;
  clean: () => void;
  setOpened: (opened: boolean) => void;
  setElement: (el: HTMLDivElement) => void;
};

const Animated = memo(function Animation({
  children,
  storeRef,
}: {
  children: ReactNode;
  storeRef: MutableRefObject<StoreApi<HeightTransitionStore>>;
}) {
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const store = storeRef.current;
    if (el.current) {
      store.getState().setElement(el.current);
    }
    return () => store.getState().clean();
  }, [storeRef]);

  return (
    <div
      ref={el}
      style={{
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
});

export function HeightTransition({
  children,
  show,
  duration = 0.5,
  beforeEnter,
  afterEnter,
  beforeLeave,
  afterLeave,
  delayEnter = 0,
  delayLeave = 0,
}: {
  children?: ReactNode;
  show: boolean;
  duration?: number;
  beforeEnter?: () => void;
  afterEnter?: () => void;
  beforeLeave?: () => void;
  afterLeave?: () => void;
  delayEnter?: number;
  delayLeave?: number;
}) {
  const storeRef = useRef<StoreApi<HeightTransitionStore>>(undefined!);
  if (storeRef.current === undefined) {
    storeRef.current = createStore<HeightTransitionStore>((set, getState) => {
      return {
        setElement: (el) => {
          set({ el });
        },
        animate: (reverse) => {
          const el = getState().el;
          if (el) {
            const tween = getState().tween;
            if (tween) {
              tween.reversed(reverse);
              return tween;
            }
            const timeline = gsap.timeline();
            if (getState().initialState) {
              timeline
                .to(el, { opacity: 1, duration: delayLeave })
                .to(el, {
                  height: 0,
                  duration: duration,
                })
                .to(el, { opacity: 1, duration: delayEnter });
            } else {
              timeline
                .to(el, { opacity: 1, duration: delayEnter })
                .to(el, {
                  height: 'auto',
                  duration: duration,
                })
                .to(el, { opacity: 1, duration: delayLeave });
            }
            set({ tween: timeline });
            return timeline;
          }
        },
        clean: () => {
          const tween = getState().tween;
          if (tween) {
            tween.revert();
            set({ tween: undefined });
          }
        },
        setOpened: (opened) => {
          if (getState().initialState === undefined) {
            const el = getState().el;
            if (el) {
              el.style.height = opened ? 'auto' : '0';
              set({ initialState: opened });
            }
          } else {
            (opened ? beforeEnter : beforeLeave)?.();
            getState()
              .animate(getState().initialState === opened)
              ?.then(opened ? afterEnter : afterLeave);
          }
        },
      };
    });
  }
  useLayoutEffect(() => {
    storeRef.current?.getState().setOpened(show);
  }, [storeRef, show]);

  useEffect(() => {
    const resizeHandler = () => storeRef.current?.getState().clean();
    window.addEventListener('resize', resizeHandler);
    return () => window.removeEventListener('resize', resizeHandler);
  });

  return <Animated storeRef={storeRef}>{children}</Animated>;
}

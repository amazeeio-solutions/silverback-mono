import clsx from 'clsx';
import { omit } from 'lodash';
import {
  createContext,
  HTMLAttributes,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * Defines a single image source.
 * Tuple of URL and intrinsic width in pixels.
 */
type ImageSource = [string, number];

/**
 * Set of additional image sources.
 */
type ImageSourceSet = {
  /**
   * Media query to determine the appropriate set.
   */
  media: string;
  /**
   * List of sources bundled in this set.
   */
  srcSet: Array<ImageSource>;
};

/**
 * Defines a single image size hint.
 * Tuple of a media query and the slot width
 * in either viewport units or pixels.
 */
type ImageSlotWidth = `${number}${'vw' | 'px'}`;
type ImageSize = [string, ImageSlotWidth] | ImageSlotWidth;

function hasMediaQuery(size: ImageSize): size is [string, ImageSlotWidth] {
  return Array.isArray(size);
}

/**
 * Simulate a picture that immediately switches to the loaded state.
 * Useful for unit testing.
 */
export const ReadyPicture: Exclude<ImageProps['Picture'], undefined> = ({
  onLoad,
  ...props
}) => {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onLoad?.(undefined as any);
  }, [onLoad]);
  return <picture {...props} />;
};

/**
 * Simulate a picture that always stays in the loading state.
 * Useful for unit testing and visually testing the loading state.
 */
export const LoadingPicture: Exclude<ImageProps['Picture'], undefined> = (
  props,
) => {
  return <picture {...omit(props, 'onLoad', 'onError')} />;
};

/**
 * Simulate a picture that immediately goes to the error state.
 * Useful for unit testing and visually testing the error state.
 */
export const ErrorPicture: Exclude<ImageProps['Picture'], undefined> = ({
  onError,
  ...props
}) => {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError?.(undefined as any);
  }, [onError]);
  return <picture {...omit(props, 'onLoad')} />;
};

/**
 * Simulate a picture that stays in loading for 1 second before switching to the loaded state.
 * Useful for testing visual transitions.
 */
export const DelayedReadyPicture: Exclude<ImageProps['Picture'], undefined> = ({
  onLoad,
  ...props
}) => {
  useEffect(() => {
    window.setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onLoad?.(undefined as any);
    }, 1000);
  }, [onLoad]);
  return <picture {...omit(props, 'onError')} />;
};

/**
 * Simulate a picture that stays in loading for 1 second before switching to the error state.
 * Useful for testing visual transitions.
 */
export const DelayedErrorPicture: Exclude<ImageProps['Picture'], undefined> = ({
  onError,
  ...props
}) => {
  useEffect(() => {
    window.setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError?.(undefined as any);
    }, 1000);
  }, [onError]);
  return <picture {...omit(props, 'onLoad')} />;
};

function RealPicture(props: HTMLAttributes<HTMLPictureElement>) {
  return <picture {...props} />;
}

type ImageProps = PropsWithChildren<{
  /**
   * The original images URL.
   */
  src: string;

  /**
   * The images alternative text.
   */
  alt: string;

  /**
   * Lazy load the image. Defaults to `true`,
   * should be disabled for critical images above the fold.
   */
  lazy?: boolean;

  /**
   * Display layout strategy.
   * - `fluid`: keep own aspect ratio, variable height
   * - `contain`: keep container height, display full image
   * - `cover`: keep container height, cover whole container
   */
  layout?: 'fluid' | 'contain' | 'cover';

  /**
   * A set of alternative image source the browser can choose from.
   */
  srcSet?: Array<ImageSource>;

  /**
   * Size definitions for different viewports to hint the browser which
   * image to choose.
   */
  sizes?: Array<ImageSize>;

  /**
   * Additional source sets for alternative image displays.
   */
  sources?: Array<ImageSourceSet>;

  /**
   * The images intrinsic width.
   */
  width: number;

  /**
   * The images intrinsic height.
   */
  height: number;

  /**
   * CSS classes that will be applied to the <picture> element.
   */
  className?: string;

  /**
   * CSS classes that will be applied to the <picture> element
   * before the image is hydrated and enters the "loading" state.
   */
  renderedClassName?: string;

  /**
   * CSS classes that will be applied to the <picture> element
   * while the image is loading.
   */
  loadingClassName?: string;

  /**
   * CSS classes that will be applied to the <picture> element
   * when the image has been loaded.
   */
  readyClassName?: string;

  /**
   * CSS classes that will be applied to the <picture> element
   * when the image could not be loaded.
   */
  errorClassName?: string;

  /**
   * Picture renderer.
   *
   * Defaults to `picture`, but allows to use a different renderer
   * for testing loading events.
   */
  Picture?: typeof RealPicture;
}>;

type ImageContext = {
  state: 'rendered' | 'loading' | 'ready' | 'error';
  props: ImageProps;
};

const ImageContext = createContext<ImageContext>({
  state: 'loading',
  props: {
    src: '',
    height: 0,
    width: 0,
    alt: '',
  },
});

/**
 * Retrieve the current image context. To be used
 * within a custom placeholder only.
 */
export function useImageContext(): ImageContext {
  return useContext(ImageContext);
}

const DefaultImageFallback = () => {
  const { props } = useImageContext();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      <div style={{ textAlign: 'center', width: '100%' }}>{props.alt}</div>
    </div>
  );
};

export function Image({
  className,
  renderedClassName,
  loadingClassName,
  errorClassName,
  readyClassName,
  alt,
  children,
  sizes,
  srcSet,
  sources,
  layout = 'fluid',
  lazy = true,
  Picture = RealPicture,
  ...props
}: ImageProps) {
  // The image starts in "rendered" state for server side rendering.
  const [state, setState] = useState<ImageContext['state']>('rendered');
  const showPlaceholder = state === 'loading' || state === 'error';
  const imageRef = useRef<HTMLImageElement>(null);

  // In the browser, initiate the state to "loading".
  useEffect(() => {
    if (state === 'rendered') {
      setState(imageRef.current?.complete ? 'ready' : 'loading');
    }
  }, [setState, imageRef, state]);

  return (
    <div
      style={
        layout === 'fluid'
          ? {
              position: 'relative',
              paddingBottom: `${(props.height * 100) / props.width}%`,
            }
          : {
              position: 'relative',
              height: '100%',
            }
      }
    >
      {showPlaceholder ? (
        <div style={{ position: 'absolute', inset: 0 }} aria-hidden={true}>
          <ImageContext.Provider
            value={{
              state,
              props: { alt, ...props },
            }}
          >
            {children ? children : <DefaultImageFallback />}
          </ImageContext.Provider>
        </div>
      ) : null}
      <Picture
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
        }}
        onLoad={() => setState('ready')}
        onError={() => setState('error')}
      >
        {sources?.map(({ media, srcSet }) => (
          <source
            key={media}
            media={media}
            srcSet={srcSet.map(([src, width]) => `${src} ${width}w`).join(', ')}
            sizes={sizes
              ?.map((size) => {
                return hasMediaQuery(size) ? size : [undefined, size];
              })
              .map(([media, size]) => (media ? `${media} ${size}` : size))
              .join(', ')}
          />
        ))}
        {srcSet ? (
          <source
            srcSet={srcSet.map(([src, width]) => `${src} ${width}w`).join(', ')}
            sizes={sizes
              ?.map((size) => {
                return hasMediaQuery(size) ? size : [undefined, size];
              })
              .map(([media, size]) => (media ? `${media} ${size}` : size))
              .join(', ')}
          />
        ) : undefined}
        <img
          ref={imageRef}
          loading={lazy ? 'lazy' : 'eager'}
          alt={alt}
          {...props}
          style={
            layout === 'fluid' ? {} : { objectFit: layout, height: '100%' }
          }
          className={clsx(className, {
            [renderedClassName || '']: state === 'rendered',
            [readyClassName || '']: state === 'ready',
            [loadingClassName || '']: state === 'loading',
            [errorClassName || '']: state === 'error',
          })}
        />
      </Picture>
    </div>
  );
}

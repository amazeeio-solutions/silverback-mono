import {
  Link as LinkComponent,
  LocationType,
  useLocation as useLocationHook,
} from '@amazeelabs/bridge';
import type { Element } from 'hast';
import { selectAll } from 'hast-util-select';
import qs, { StringifiableRecord } from 'query-string';
import React, {
  AnchorHTMLAttributes,
  ComponentType,
  createElement,
  DetailedHTMLProps,
} from 'react';
import rehypeParse from 'rehype-parse';
import rehypeReact from 'rehype-react';
import rehypeSlug from 'rehype-slug';
import { omit } from 'remeda';
import { Pluggable, Plugin, unified } from 'unified';

export { LocationProvider } from '@amazeelabs/bridge';

declare const Url: unique symbol;
export type Url = string & {
  _opaque: typeof Url;
};

type LinkOverrideProps = {
  search?: StringifiableRecord;
  hash?: string;
};

type LinkDisplayProps = {
  activeClassName?: string;
};

function isUrl(input: unknown): input is Url {
  return typeof input === 'string';
}

export function overrideUrlParameters(
  url: Url | LocationType,
  search?: StringifiableRecord,
  hash?: string,
): Url {
  if (isUrl(url)) {
    if (['/', '#', '?', 'javascript:'].includes(url[0])) {
      return overrideUrlParameters(
        `relative://${url}` as Url,
        search,
        hash,
      ).replace('relative://', '') as Url;
    }
    const parsed = qs.parseUrl(url, { parseFragmentIdentifier: true });

    return qs.stringifyUrl(
      {
        url: parsed.url,
        fragmentIdentifier:
          typeof hash === 'undefined' ? parsed.fragmentIdentifier : hash,
        query: { ...parsed.query, ...search },
      },
      {
        skipNull: true,
      },
    ) as Url;
  } else {
    return overrideUrlParameters(
      `${url.pathname}${url.search ? `?${url.search}` : ''}${
        url.hash ? `#${url.hash}` : ''
      }` as Url,
      search,
      hash,
    ) as Url;
  }
}

export type LinkProps = Omit<
  DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>,
  'href'
> & { href: Url | LocationType } & LinkOverrideProps &
  LinkDisplayProps;

const isInternalTarget = (target?: string) =>
  typeof target === 'undefined' || target === '' || target === '_self';

const isRelative = (url?: Url | LocationType) =>
  // If a location object is passed, it's always internal, since it's
  // created by `useLocation`.
  isLocation(url) ||
  url?.startsWith('javascript:') ||
  url?.startsWith('#') ||
  url?.startsWith('?') ||
  Boolean(url?.match(/^\/(?!\/)/));

export const isDownload = (url?: Url | LocationType) => {
  const regex = /\.[0-9a-z]+$/i;
  return url
    ? isLocation(url)
      ? Boolean(url.pathname.match(regex))
      : Boolean(url.match(regex))
    : false;
};

const isLocation = (input?: Url | LocationType): input is LocationType =>
  typeof input !== 'string';

export function Link({ href, search, hash, target, ...props }: LinkProps) {
  if (isInternalTarget(target) && isRelative(href) && !isDownload(href)) {
    return (
      <LinkComponent
        href={overrideUrlParameters(href, search, hash)}
        target={target}
        {...props}
      />
    );
  } else {
    return (
      <a
        target={target || '_blank'}
        rel={props.rel || (isRelative(href) ? undefined : 'noreferrer')}
        href={overrideUrlParameters(href, search, hash)}
        {...props}
      >
        {props.children}
      </a>
    );
  }
}

export function useLocation(): [
  LocationType,
  (
    url: LocationType | Url,
    search?: StringifiableRecord,
    hash?: string,
  ) => void,
] {
  const [location, navigate] = useLocationHook();
  return [
    location,
    (url, search, hash) => {
      navigate(overrideUrlParameters(url, search, hash));
    },
  ];
}

declare const ImageSource: unique symbol;
export type ImageSource = string & {
  _opaque: typeof ImageSource;
};

function base64(content: string) {
  if (typeof btoa === 'undefined') {
    return Buffer.from(content, 'base64').toString('binary');
  }
  return btoa(content);
}

export function parseCloudinaryUrl(url: string) {
  const prefix = 'https://res.cloudinary.com/';
  const config = url.substring(prefix.length);
  const pos =
    config.indexOf('/http') + 1 ||
    config.indexOf('/blob:http') + 1 ||
    config.indexOf('//') + 1;
  const source = config.substring(pos);
  const match =
    /(?<cloudname>.*?)\/image\/fetch\/.*?\/f_auto\/?(?<transform>.*)/.exec(
      config.substring(0, pos - 1),
    );
  if (!match) {
    return undefined;
  }
  const chain = match.groups!.transform.split('/');
  let width: number | undefined;
  let height: number | undefined;
  const transforms = [];
  for (const transform of chain) {
    for (const operation of transform.split(',')) {
      // TODO: dimension prediction does not take chained transforms into account
      if (operation.startsWith('w_')) {
        width = parseInt(operation.substring(2));
      } else if (operation.startsWith('h_')) {
        height = parseInt(operation.substring(2));
      } else {
        transforms.push(operation);
      }
    }
  }
  return {
    cloudName: match.groups!.cloudname,
    src: source as string,
    transform: match.groups!.transform as string,
    width,
    height,
  };
}

function dummyImage(
  mode: string,
  config: { width: number; height: number; transform?: string },
) {
  const width = config.width;
  const height = config.height;
  const boxHeight = Math.floor(height / 10);
  const debug = `<rect x="0" y="${
    height / 2 - boxHeight / 2
  }" width="100%" height="${boxHeight}" fill="rgba(0,0,0,0.5)"></rect><text fill="rgba(255,255,255,0.8)" x="50%" y="50%" style="font-family: sans-serif;font-size: ${Math.floor(
    boxHeight * 0.8,
  )};line-height: ${Math.floor(
    boxHeight * 0.8,
  )};font-weight:bold;text-anchor: middle; dominant-baseline: central;">${width} x ${height}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${
    mode === 'test' ? debug : ''
  }</svg>`;
  return `data:image/svg+xml;base64,${base64(svg)}`;
}

function processImageSource(
  source: ImageSourceStructure,
): ImageSourceStructure {
  const { src, width, height } = source;
  const info = parseCloudinaryUrl(src);
  if (info && ['test', 'demo'].includes(info.cloudName)) {
    return {
      ...source,
      src: dummyImage(info.cloudName, { width, height }),
      srcset:
        source.srcset?.replace(
          /https:\/\/res\.cloudinary\.com\/[^\s]+/g,
          (url) => {
            const i = parseCloudinaryUrl(url);
            if (i && ['test', 'demo'].includes(i.cloudName)) {
              return dummyImage(i.cloudName, {
                width: i.width || width,
                height: i.height || width * (height / width),
              });
            }
            return url;
          },
        ) || '',
    };
  }
  return source;
}

export type ImageSourceStructure = {
  originalSrc: string;
  src: string;
  srcset: string;
  sizes: string;
  width: number;
  height: number;
  sources: Array<{
    media: string;
    src: string;
    srcset: string;
    width: number;
    height: number;
  }>;
};

export function Image({
  source,
  priority,
  alt,
  ...props
}: {
  source: ImageSource;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const { originalSrc, srcset, ...imageData } = processImageSource(
    JSON.parse(source) as ImageSourceStructure,
  );
  return (
    <img
      decoding={priority ? 'sync' : 'async'}
      loading={priority ? 'eager' : 'lazy'}
      {...imageData}
      srcSet={srcset}
      data-src={originalSrc}
      // Set object fit to "cover", to never
      // distort an image, even if the width
      // and height don't match.
      // This is the case when an image is
      // loaded unprocessed for testing.
      style={{
        objectFit: 'cover',
        maxWidth: '100%',
        ...(imageData.src.startsWith('data:image/svg+xml')
          ? {
              backgroundImage: `url(${originalSrc})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }
          : {}),
      }}
      alt={alt}
      {...props}
    />
  );
}

declare const Timestamp: unique symbol;
export type Timestamp = string & {
  _opaque: typeof Timestamp;
};

export function timestamp(input: Timestamp) {
  return new Date(input);
}

declare const Markup: unique symbol;
export type Markup = string & {
  _opaque: typeof Markup;
};

const rehypeAddClasses: Plugin<[{ [key: string]: string }], Element> =
  (settings) =>
  (
    // @ts-expect-error TODO (Philipp): Take a look at this.
    tree,
  ) => {
    Object.keys(settings || {}).forEach((matcher) => {
      const cls = settings[matcher];
      selectAll(matcher, tree).forEach((node) => {
        if (!node.properties) {
          node.properties = { class: cls };
        } else {
          node.properties.class = [node.properties.class, cls].join();
        }
        node.properties['class'] = cls;
      });
    });
  };

export function Html({
  markup,
  classNames,
  components,
  plugins,
}: {
  markup: Markup;
  classNames?: {
    [key: string]: string;
  };
  components?: Partial<{
    [TagName in keyof JSX.IntrinsicElements]:
      | keyof JSX.IntrinsicElements
      | ComponentType<{ node: Element } & JSX.IntrinsicElements[TagName]>;
  }>;
  plugins?: Pluggable[];
}) {
  return unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeAddClasses, classNames || {})
    .use(rehypeSlug)
    .use(plugins || [])
    .use(rehypeReact, {
      Fragment: React.Fragment,
      createElement,
      passNode: true,
      components: {
        ...{
          a: (props) => {
            const { children, href, ...rest } = omit(props, ['node']);
            return createElement(
              Link,
              {
                href: (href || '/') as Url,
                ...rest,
              },
              children,
            );
          },
          ...components,
        },
      },
    })
    .processSync(markup).result;
}

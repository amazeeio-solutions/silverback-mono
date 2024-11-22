import IframeResizer, { IFrameObject } from 'iframe-resizer-react';
import React, { useRef, useState } from 'react';

import {
  IframeCommandOther,
  IframeCommandScroll,
  isIframeCommand,
} from '../types/iframe-command';

type OwnProps = {
  buildMessages: (htmlMessages: Array<string>) => JSX.Element | null;
  redirect: (url: string, htmlMessages?: Array<string>) => void;
  scroll?: (to: string, iframeWrapper: HTMLElement) => void;
  /**
   * Not recommended for using in production.
   * Because injecting CSS takes time and produces flashing.
   */
  cssStylesToInject?: string;
};

type Props = OwnProps & IframeResizer.IframeResizerProps;

export const SilverbackIframe = ({
  buildMessages,
  redirect,
  scroll,
  cssStylesToInject,
  ...iframeResizerProps
}: Props) => {
  const silverbackIframeReference = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<IFrameObject>(null);
  const [iframeSeed, setIframeSeed] = useState<string | null>(null);
  const [currentCommand, setCurrentCommand] = useState<
    IframeCommandOther | IframeCommandScroll
  >();

  return (
    <div className="silverback-iframe" ref={silverbackIframeReference}>
      <div className="silverback-iframe-messages">
        {(currentCommand?.action === 'displayMessages' ||
          currentCommand?.action === 'replaceWithMessages') &&
          buildMessages(currentCommand.messages)}
      </div>
      {currentCommand?.action !== 'replaceWithMessages' && (
        <IframeResizer
          {...iframeResizerProps}
          forwardRef={iframeRef}
          src={
            iframeResizerProps.src &&
            updateUrlParameters(iframeResizerProps.src, {
              iframe: 'true',
              iframeSeed: iframeSeed,
            })
          }
          onMessage={({ message }) => {
            if (!isIframeCommand(message)) {
              return;
            }
            if (message.action === 'init') {
              iframeRef.current?.sendMessage(
                {
                  silverbackIframe: {
                    type: 'init',
                    baseUrl: window.location.origin,
                    injectStyles: cssStylesToInject,
                  },
                },
                '*',
              );
              return;
            }
            if (message.action === 'redirect') {
              redirect(message.path, message.messages);
              // In case if redirect path is the same with the current path,
              // the redirect() call may do nothing (Gatsby case). Here we
              // change the URL of the iframe (and update the iframe contents)
              // to imitate a redirect to the same page.
              setIframeSeed(Date.now().toString());
            } else {
              setCurrentCommand(message);
            }
            if (
              message.action === 'scroll' &&
              silverbackIframeReference &&
              silverbackIframeReference.current
            ) {
              // If the component received a scroll handler, then just call it.
              // Otherwise we fallback to a very simple scroll implementation.
              if (scroll) {
                scroll(message.scroll, silverbackIframeReference.current);
              } else {
                scrollIframe(message.scroll, silverbackIframeReference.current);
              }
            }
          }}
        />
      )}
    </div>
  );
};

const scrollIframe = (to: string, iframeWrapper: HTMLElement) => {
  // For now, we have only implemented the scroll to top feature.
  switch (to) {
    case 'top':
    default:
      iframeWrapper.scrollIntoView({ behavior: 'smooth' });
  }
};

const updateUrlParameters = (
  uri: string,
  parameters: Record<string, string | null>,
): string => {
  let result = uri;
  Object.entries(parameters).forEach(([key, value]) => {
    result = updateUrlParameter(result, key, value);
  });
  return result;
};

// From https://gist.github.com/niyazpk/f8ac616f181f6042d1e0#gistcomment-3797774
const updateUrlParameter = (
  uri: string,
  key: string,
  value: string | null,
): string => {
  // remove the hash part before operating on the uri
  const i = uri.indexOf('#');
  const hash = i === -1 ? '' : uri.substr(i);
  uri = i === -1 ? uri : uri.substr(0, i);

  const re = new RegExp(`([?&])${key}=.*?(&|$)`, 'i');
  const separator = uri.indexOf('?') !== -1 ? '&' : '?';

  if (value === null) {
    // remove key-value pair if value is specifically null
    uri = uri.replace(new RegExp(`([?&]?)${key}=[^&]*`, 'i'), '');
    if (uri.slice(-1) === '?') {
      uri = uri.slice(0, -1);
    }
    // replace first occurrence of & by ? if no ? is present
    if (uri.indexOf('?') === -1) uri = uri.replace(/&/, '?');
  } else if (uri.match(re)) {
    uri = uri.replace(re, `$1${key}=${value}$2`);
  } else {
    uri = `${uri + separator + key}=${value}`;
  }
  return uri + hash;
};

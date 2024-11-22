export type IframeCommandInit = {
  action: 'init';
};

export type IframeCommandRedirect = {
  action: 'redirect';
  path: string;
  messages?: Array<string>;
};

export type IframeCommandOther = {
  action: 'replaceWithMessages' | 'displayMessages';
  messages: Array<string>;
  scroll?: string;
};

export type IframeCommandScroll = {
  action: 'scroll';
  scroll: string;
};

export type IframeCommand =
  | IframeCommandInit
  | IframeCommandRedirect
  | IframeCommandOther
  | IframeCommandScroll;

export const isIframeCommand = (
  variable: unknown,
): variable is IframeCommand => {
  if (
    typeof variable === 'object' &&
    variable !== null &&
    'action' in variable &&
    typeof variable.action === 'string'
  ) {
    if (variable.action === 'init') {
      return true;
    }
    if (
      variable.action === 'scroll' &&
      'scroll' in variable &&
      typeof variable.scroll === 'string'
    ) {
      return true;
    }
    if (
      variable.action === 'redirect' &&
      'path' in variable &&
      typeof variable.path === 'string' &&
      (!('messages' in variable) || isArrayOfStrings(variable.messages))
    ) {
      return true;
    }
    if (
      ['replaceWithMessages', 'displayMessages'].includes(variable.action) &&
      'messages' in variable &&
      isArrayOfStrings(variable.messages)
    ) {
      return true;
    }
  }
  return false;
};

const isArrayOfStrings = (variable: unknown): variable is Array<string> =>
  Array.isArray(variable) && !variable.find((item) => typeof item !== 'string');

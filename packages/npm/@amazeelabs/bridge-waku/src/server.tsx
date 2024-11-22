import type { LocationProviderType, useLocationType } from '@amazeelabs/bridge';
import serverContext from 'server-only-context';

// @ts-expect-error: Typing issue in server-only-context
const [getPath, setPath] = serverContext('/');
// @ts-expect-error: Typing issue in server-only-context
const [getParams, setParams] = serverContext(new URLSearchParams());

export { createLinkComponent } from './link.js';

export const createUseLocationHook: () => useLocationType = () => () => {
  const params = getParams();
  return [
    {
      pathname: getPath(),
      search: params.toString(),
      searchParams: params,
      hash: '',
    },
    () => undefined,
  ];
};

export const LocationProvider: LocationProviderType = ({
  children,
  currentLocation,
}) => {
  setPath(currentLocation?.pathname || '/');
  setParams(currentLocation?.searchParams || new URLSearchParams());
  return <>{children}</>;
};

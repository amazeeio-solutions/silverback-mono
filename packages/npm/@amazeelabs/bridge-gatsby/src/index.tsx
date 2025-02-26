import type {
  LinkType,
  LocationProviderType,
  useLocationType,
} from '@amazeelabs/bridge';
import { useLocation as gatsbyUseLocation } from '@reach/router';
import { Link as GatsbyLink, navigate as gatsbyNavigate } from 'gatsby';
import React, { ComponentProps, forwardRef } from 'react';

export const Link: LinkType = forwardRef<
  HTMLAnchorElement,
  ComponentProps<LinkType>
>(function Link({ href, ...props }, ref) {
  // @ts-expect-error: gatsby ref typing issues
  return <GatsbyLink to={href || '/'} {...props} ref={ref} />;
});

export const useLocation: useLocationType = () => {
  const location = gatsbyUseLocation();
  return [
    new URL(location.href || location.pathname, 'relative:/'),
    gatsbyNavigate,
  ];
};

export const LocationProvider: LocationProviderType = ({ children }) => {
  return <>{children}</>;
};

import type {
  LinkType,
  LocationProviderType,
  useLocationType,
} from '@amazeelabs/bridge';
import { useLocation as gatsbyUseLocation } from '@reach/router';
import { Link as GatsbyLink, navigate as gatsbyNavigate } from 'gatsby';
import React, { ComponentProps, useEffect } from 'react';

export const Link: LinkType &
  Pick<ComponentProps<typeof GatsbyLink>, 'ref'> = ({ href, ...props }) => {
  return <GatsbyLink to={href || '/'} {...props} />;
};

export const useLocation: useLocationType = () => {
  const location = gatsbyUseLocation();
  const [updatedSearch, setUpdatedSearch] = React.useState('');
  useEffect(() => {
    if (location.search) setUpdatedSearch(location.search);
  }, [location.search]);

  return [
    {
      ...location,
      search: updatedSearch,
      searchParams: new URLSearchParams(updatedSearch),
    },
    gatsbyNavigate,
  ];
};

export const LocationProvider: LocationProviderType = ({ children }) => {
  return <>{children}</>;
};

import type {
  LinkType,
  LocationProviderType,
  LocationType,
  useLocationType,
} from '@amazeelabs/bridge';
import { action } from '@storybook/addon-actions';
import React, {
  ComponentProps,
  createContext,
  forwardRef,
  useContext,
  useState,
} from 'react';

type SetLocation = (location: LocationType) => void;

const LocationContext = createContext<
  | {
      location: LocationType;
      setLocation: SetLocation;
    }
  | undefined
>(undefined);

export const LocationProvider: LocationProviderType = ({
  children,
  currentLocation = new URL('/', 'relative:/'),
}) => {
  const [location, setLocation] = useState(currentLocation);
  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation: useLocationType = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error(
      'LocationProvider not found. Please add it to preview.tsx.',
    );
  }
  return [
    context.location,
    (target) => {
      if (!target) {
        action('navigate')('invalid target');
      } else {
        action('navigate')(target);
        context.setLocation(new URL(target, 'relative:/'));
      }
    },
  ];
};

export const Link: LinkType = forwardRef<
  HTMLAnchorElement,
  ComponentProps<LinkType>
>(function Link({ onClick, ...props }, ref) {
  const [, navigate] = useLocation();
  return (
    <a
      {...props}
      ref={ref}
      onClick={
        onClick
          ? onClick
          : (ev) => {
              ev.preventDefault();
              if (props.href) {
                navigate(props.href);
              }
            }
      }
    >
      {props.children}
    </a>
  );
});

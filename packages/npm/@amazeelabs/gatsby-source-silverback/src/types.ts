import { GraphQLFieldResolver } from 'graphql';

export type SilverbackPageContext = {
  typeName: string;
  id: string;
  remoteId: string;
  locale?: string;
  localizations?: Array<{
    path: string;
    locale: string;
  }>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SilverbackResolver = GraphQLFieldResolver<any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SilverbackSource<T = any> = () => Array<[string, T]>;

/* eslint-disable @typescript-eslint/no-explicit-any */

// Take types for all the untyped stuff in Decap.
declare module 'decap-cms-ui-default' {
  export const AuthenticationPage;
  export const buttons: any;
  export const colors: any;
  export const colorsRaw: any;
  export const lengths: any;
  export const shadows: any;
  export const zIndex: any;
}

declare module 'decap-cms-lib-util' {
  export type Credentials = any;
  export interface Implementation {
    authComponent: () => void;
    restoreUser: (user: any) => Promise<any>;

    authenticate: (credentials: any) => Promise<any>;
    logout: () => Promise<void> | void | null;
    getToken: () => Promise<string | null>;

    getEntry: (path: string) => Promise<any>;
    entriesByFolder: (
      folder: string,
      extension: string,
      depth: number,
    ) => Promise<any[]>;
    entriesByFiles: (files: any[]) => Promise<any[]>;

    getMediaDisplayURL: (displayURL: any) => Promise<string>;
    getMedia: (folder?: string) => Promise<any[]>;
    getMediaFile: (path: string) => Promise<any>;

    persistEntry: (entry: any, opts: any) => Promise<void>;
    persistMedia: (file: any, opts: any) => Promise<any>;
    deleteFiles: (paths: string[], commitMessage: string) => Promise<void>;

    unpublishedEntries: () => Promise<string[]>;
    unpublishedEntry: (args: {
      id?: string;
      collection?: string;
      slug?: string;
    }) => Promise<any>;
    unpublishedEntryDataFile: (
      collection: string,
      slug: string,
      path: string,
      id: string,
    ) => Promise<string>;
    unpublishedEntryMediaFile: (
      collection: string,
      slug: string,
      path: string,
      id: string,
    ) => Promise<any>;
    updateUnpublishedEntryStatus: (
      collection: string,
      slug: string,
      newStatus: string,
    ) => Promise<void>;
    publishUnpublishedEntry: (
      collection: string,
      slug: string,
    ) => Promise<void>;
    deleteUnpublishedEntry: (collection: string, slug: string) => Promise<void>;
    getDeployPreview: (
      collectionName: string,
      slug: string,
    ) => Promise<{ url: string; status: string } | null>;

    allEntriesByFolder?: (
      folder: string,
      extension: string,
      depth: number,
      pathRegex?: RegExp,
    ) => Promise<any[]>;
    traverseCursor?: (
      cursor: any,
      action: string,
    ) => Promise<{ entries: any[]; cursor: any }>;

    isGitBackend?: () => boolean;
    status: () => Promise<{
      auth: { status: boolean };
      api: { status: boolean; statusPage: string };
    }>;
  }
}

declare module 'decap-cms-backend-github' {
  import { Implementation } from 'decap-cms-lib-util';

  export class GitHubBackend implements Implementation {
    constructor(...args: any[]);
    authComponent: () => void;
    restoreUser: (user: any) => Promise<any>;

    authenticate: (credentials: any) => Promise<any>;
    logout: () => Promise<void> | void | null;
    getToken: () => Promise<string | null>;

    getEntry: (path: string) => Promise<any>;
    entriesByFolder: (
      folder: string,
      extension: string,
      depth: number,
    ) => Promise<any[]>;
    entriesByFiles: (files: any[]) => Promise<any[]>;

    getMediaDisplayURL: (displayURL: any) => Promise<string>;
    getMedia: (folder?: string) => Promise<any[]>;
    getMediaFile: (path: string) => Promise<any>;

    persistEntry: (entry: any, opts: any) => Promise<void>;
    persistMedia: (file: any, opts: any) => Promise<any>;
    deleteFiles: (paths: string[], commitMessage: string) => Promise<void>;

    unpublishedEntries: () => Promise<string[]>;
    unpublishedEntry: (args: {
      id?: string;
      collection?: string;
      slug?: string;
    }) => Promise<any>;
    unpublishedEntryDataFile: (
      collection: string,
      slug: string,
      path: string,
      id: string,
    ) => Promise<string>;
    unpublishedEntryMediaFile: (
      collection: string,
      slug: string,
      path: string,
      id: string,
    ) => Promise<any>;
    updateUnpublishedEntryStatus: (
      collection: string,
      slug: string,
      newStatus: string,
    ) => Promise<void>;
    publishUnpublishedEntry: (
      collection: string,
      slug: string,
    ) => Promise<void>;
    deleteUnpublishedEntry: (collection: string, slug: string) => Promise<void>;
    getDeployPreview: (
      collectionName: string,
      slug: string,
    ) => Promise<{ url: string; status: string } | null>;

    allEntriesByFolder: (
      folder: string,
      extension: string,
      depth: number,
      pathRegex?: RegExp,
    ) => Promise<any[]>;
    traverseCursor: (
      cursor: any,
      action: string,
    ) => Promise<{ entries: any[]; cursor: any }>;

    isGitBackend?: () => boolean;
    status: () => Promise<{
      auth: { status: boolean };
      api: { status: boolean; statusPage: string };
    }>;
  }
}

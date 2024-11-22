import scrape from 'website-scraper';

type Options = {
  urlFilter?: (url: string) => boolean;
  filenameGenerator?: string;
  defaultFilename?: string;
  prettifyUrls?: boolean;
  request?: {
    headers: {
      [key: string]: unknown;
    };
  };
  recursive?: boolean;
  maxDepth?: number;
  ignoreErrors?: boolean;
  maxRecursiveDepth?: number;
  requestConcurrency?: number;
  plugins?: object[];
};

export async function saveWebpage(args: {
  /**
   * URL of the target webpage.
   */
  url: string;
  /**
   * Replaces the actual webpage content.
   */
  content?: string;
  /**
   * Path to directory where downloaded files will be saved. Must not exist.
   */
  directory: string;
  /**
   * Other options to pass to website-scraper.
   */
  options?: Options | undefined;
}): Promise<void> {
  await scrape({
    ...args.options,
    directory: args.directory,
    urls: [args.url],
    plugins: [
      ...(args.content ? [new ReplaceContentPlugin(args.content)] : []),
      ...(args.options?.plugins || []),
    ],
  });
}

// Replaces the first request response with given content.
class ReplaceContentPlugin {
  isFirstRequest = true;

  constructor(public firstRequestResponse: string) {}

  apply(
    registerAction: (
      event: 'afterResponse',
      handler: <T>(args: { response: T }) => Promise<
        | T
        | {
            body: string;
            encoding: 'utf8';
            metadata: {};
          }
      >,
    ) => void,
  ): void {
    registerAction('afterResponse', async ({ response }) => {
      if (this.isFirstRequest) {
        this.isFirstRequest = false;
        return {
          body: this.firstRequestResponse,
          encoding: 'utf8',
          metadata: {},
        };
      } else {
        this.isFirstRequest = false;
        return response;
      }
    });
  }
}

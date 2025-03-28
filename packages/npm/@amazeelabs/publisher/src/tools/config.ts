import { existsSync } from 'fs';
import { join } from 'path';
import { loadSync } from 'ts-import';

import { OAuth2GrantTypes } from './oAuth2GrantTypes';

type PublisherConfigBase = {
  /**
   * Port on which the publisher server will be running.
   */
  publisherPort: number;
  /**
   * Host on which the publisher server will be running.
   *
   * Default: "0.0.0.0"
   */
  publisherHost?: string;
  /**
   * The URL of the database.
   *
   * Example: "persisted-store/publisher.sqlite"
   */
  databaseUrl: string;
  /**
   * Enables basic auth.
   */
  basicAuth?: {
    username: string;
    password: string;
  };
  /**
   * Enables OAuth2.
   */
  oAuth2?: {
    clientId: string;
    clientSecret: string;
    scope: string;
    tokenHost: string;
    tokenPath: string;
    grantType: OAuth2GrantTypes;
    // Use for Authorization Code grant type only.
    authorizePath?: string;
    sessionSecret?: string;
    environmentType?: string; // 'development' | 'production';
  };
  /**
   * Specific CORS settings.
   *
   * If omitted, publisher will allow all origins.
   */
  corsOptions?: {
    credentials: boolean;
    origin: Array<string>;
  };
  /**
   * A Map of response headers that should be added to every route.
   *
   * Example: (new Map()).set('X-Frame-Options', 'deny')
   * The above would set the "X-Frame-Options" response header to "deny".
   */
  responseHeaders?: Map<string, string>;
  /**
   * Proxy settings.
   *
   * Example:
   * [
   *   {
   *     prefix: "/sites/default/files",
   *     target: "https://drupal.site",
   *   },
   *   {
   *     prefix: "/graphql",
   *     target: "https://drupal.site",
   *   },
   * ],
   */
  proxy?: Array<{
    prefix: string;
    target: string;
  }>;
};

export type PublisherConfigLocal = PublisherConfigBase & {
  /**
   * The build and deploy happen locally via running cli commands.
   */
  mode: 'local';
  commands: {
    /**
     * Clean the current build and caches.
     *
     * Example: "pnpm gatsby clean"
     */
    clean: string;
    /**
     * Build the project.
     *
     * If the command fails, it will be retried:
     * - There are 3 attempts in total
     * - If the first build fails, the clean command will be executed before the
     *   second attempt
     */
    build: {
      /**
       * Example: "pnpm gatsby build"
       */
      command: string;
      /**
       * If the command will not output anything within the specified time (ms),
       * it will be killed and the build attempt will be counted as a failure.
       */
      outputTimeout?: number;
    };
    /**
     * Deploy the build.
     *
     * Example: "pnpm netlify deploy --dir=public --prodIfUnlocked"
     */
    deploy?: string;
    /**
     * Serve the build.
     */
    serve?: {
      /**
       * Example: "pnpm gatsby serve"
       */
      command: string;
      /**
       * A pattern that will be searched in the output of the command.
       *
       * Example: "You can now view"
       */
      readyPattern: string;
      /**
       * If the readyPattern is not found in the output of the command within
       * the specified time (ms), there will be a warning.
       */
      readyTimeout?: number;
      /**
       * The port on which serve will be running. Used to proxy the requests.
       */
      port: number;
    };
  };
};

export type PublisherConfigGithubWorkflow = PublisherConfigBase & {
  /**
   * The build and deploy happen in a Github CI workflow.
   *
   * Publisher will use github-cli to trigger the workflow run.
   *
   * Ensure the following:
   *  - github-cli is installed and accessible via the `gh` command
   *  - GITHUB_TOKEN is set in the environment for authentication
   */
  mode: 'github-workflow';
  /**
   * The base URL of the publisher.
   *
   * Used to construct the workflow run status callback URL.
   *
   * Example: "https://build.example.com"
   */
  publisherBaseUrl: string;
  /**
   * The name of the workflow file.
   *
   * Example: "build.yml"
   */
  workflow: string;
  /**
   * The repository name.
   *
   * Example: "AmazeeLabs/project"
   */
  repo: string;
  /**
   * The branch name.
   *
   * Example: "dev"
   */
  ref: string;
  /**
   * The environment name.
   *
   * Example: "dev-cb"
   *
   * When Publisher needs to cancel a build, it will search for a workflow run
   * with the run-name containing "[env: {env}]" patten, e.g. "[env: dev-cb]".
   */
  environment: string;
  /**
   * The environment variables to be set for the workflow run.
   *
   * Example: {
   *   DRUPAL_URL: 'https://dev-cb.cms.example.com',
   * }
   */
  environmentVariables?: Record<string, string>;
  /**
   * Additional inputs for the workflow.
   *
   * The `publisher_payload` input is reserved for the Publisher.
   *
   * Example:{
   *   env: 'dev-cb',
   * }
   */
  inputs?: Record<string, string>;
  /**
   * The timeout for the workflow run in milliseconds.
   *
   * Example: 1000 * 60 * 30
   */
  workflowTimeout: number;
  /**
   * If true, a clean build will be triggered right after the application is
   * started.
   *
   * Default: false
   *
   * This option is not recommended. It is better to trigger a clean build
   * from the outside with a POST request. E.g. as a Drupal post-rollout task.
   * Example: curl -X POST "$PUBLISHER_URL/___status/clean"
   * However, this option can be used on the setups where Publisher and Drupal
   * deployments aren't synchronized and finish at different times.
   */
  cleanBuildOnStart?: boolean;
};

export type PublisherConfig =
  | PublisherConfigLocal
  | PublisherConfigGithubWorkflow;

let _config: PublisherConfig | null = null;

export const getConfig = (): PublisherConfig => {
  if (!_config) {
    const configPath = join(process.cwd(), 'publisher.config.ts');
    if (!existsSync(configPath)) {
      console.error(`Publisher config not found: ${configPath}`);
      process.exit(1);
    }
    const config = loadSync(configPath, {
      compiledJsExtension: '.cjs',
    }).default;
    setConfig(config);
  }
  return _config!;
};

export const getConfigLocal = (): PublisherConfigLocal => {
  const config = getConfig();
  if (config.mode !== 'local') {
    throw new Error('Config is not "local"');
  }
  return config;
};

export const getConfigGithubWorkflow = (): PublisherConfigGithubWorkflow => {
  const config = getConfig();
  if (config.mode !== 'github-workflow') {
    throw new Error('Config is not "github-workflow"');
  }
  return config;
};

export const setConfig = (config: PublisherConfig): void => {
  _config = config;
};

export const clearConfig = (): void => {
  _config = null;
};

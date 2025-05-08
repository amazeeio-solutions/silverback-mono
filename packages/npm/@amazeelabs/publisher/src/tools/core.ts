import { ApplicationState } from '@amazeelabs/publisher-shared';
import { Observable } from 'rxjs';

import { core as coreGithubWorkflow } from '../mode-github-workflow/core';
import { core as coreLocal } from '../mode-local/core';
import { getConfig } from './config';
import { OutputSubject } from './output';

export type Core = {
  state: {
    applicationState$: Observable<ApplicationState>;
  };
  output$: OutputSubject;
  start: () => void;
  stop: () => Promise<void>;
  build: () => void;
  clean: () => Promise<void>;
  getBuildNumber: () => number;
};

export type CoreGithubWorkflow = typeof coreGithubWorkflow;

const mode = getConfig().mode;

export const core: Core =
  mode === 'local'
    ? coreLocal
    : mode === 'github-workflow'
      ? coreGithubWorkflow
      : ((): never => {
          throw new Error(`Unsupported mode: ${mode}`);
        })();

import { execSync, SpawnSyncReturns } from 'node:child_process';

import {
  ApplicationState,
  WorkflowPublisherPayload,
} from '@amazeelabs/publisher-shared';
import { skip } from 'rxjs';

import { getConfigGithubWorkflow as config } from '../tools/config';
import { saveBuildInfo } from '../tools/database';
import { TaskController, TaskJob } from '../tools/queue';
import { core } from './core';

export const buildTask: (args?: { clean: boolean }) => TaskJob =
  (args) => async (controller) => {
    core.state.buildNumber++;
    core.state.applicationState$.next(
      core.state.buildNumber === 1
        ? ApplicationState.Starting
        : ApplicationState.Updating,
    );

    const startedAt = Date.now();

    const output: Array<string> = [];
    const outputSubscription = core.output$.subscribe((chunk) => {
      output.push(
        `${new Date().toISOString().substring(0, 19).replace('T', ' ')} ${chunk}`,
      );
    });

    const finalizeBuild = (isSuccess: boolean): boolean => {
      core.state.applicationState$.next(
        isSuccess ? ApplicationState.Ready : ApplicationState.Error,
      );
      saveBuildInfo({
        type: 'github-workflow',
        startedAt,
        finishedAt: Date.now(),
        success: isSuccess,
        logs: output.join(''),
      });
      outputSubscription.unsubscribe();
      return isSuccess;
    };

    const attempts =
      core.state.buildNumber === 1
        ? 3 // The first build gets 3 attempts.
        : 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const result =
        attempt === 2
          ? await runWorkflow({ controller, clean: true })
          : await runWorkflow({ controller, clean: !!args?.clean });
      if (result) {
        return finalizeBuild(true);
      }
    }
    return finalizeBuild(false);
  };

async function runWorkflow(args: {
  clean: boolean;
  controller: TaskController;
}): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (args.clean) {
      core.output$.next('Starting the workflow (clean build 🧹)', 'info');
    } else {
      core.output$.next('Starting the workflow', 'info');
    }

    const timeout = setTimeout(() => {
      core.output$.next('Timeout reached', 'error');
      args.controller.cancel();
    }, config().workflowTimeout);

    args.controller.onCancel(async () => {
      core.output$.next('Cancelling the workflow', 'warning');
      await cancelWorkflow();
      clearTimeout(timeout);
      return resolve(false);
    });

    try {
      execSync(
        `gh workflow run ${config().workflow} --repo ${config().repo} --ref ${config().ref} --json`,
        {
          input: JSON.stringify({
            ...config().inputs,
            publisher_payload: JSON.stringify({
              callbackUrl:
                config().publisherBaseUrl + '/github-workflow-status',
              clearCache: args.clean,
              environmentVariables: config().environmentVariables,
            } satisfies WorkflowPublisherPayload),
          }),
        },
      );
    } catch (error) {
      core.output$.next('Error starting the workflow', 'error');
      logExecError(error);

      clearTimeout(timeout);
      return resolve(false);
    }

    const subscription = core.state.workflowState$
      .pipe(
        // Ignore the initial state, or the state coming from the previous build.
        skip(1),
      )
      .subscribe((state) => {
        if (state === 'started') {
          core.output$.next('Workflow started', 'info');
          core.output$.next('Logs: ' + core.state.workflowRunUrl);
          return;
        }
        if (state === 'success' || state === 'failure') {
          subscription.unsubscribe();
          if (state === 'success') {
            core.output$.next('Workflow succeeded', 'success');
          } else {
            core.output$.next('Workflow failed or cancelled', 'error');
          }
          core.output$.next('Logs: ' + core.state.workflowRunUrl);
          clearTimeout(timeout);
          return resolve(state === 'success');
        }
      });
  });
}

export const cancelWorkflowTask: TaskJob = async () => {
  await cancelWorkflow();
  return true;
};

async function cancelWorkflow(): Promise<void> {
  type Run = { name: string; conclusion: string; databaseId: number };

  function matchesEnvironment(run: Run): boolean {
    return run.name.includes(`[env: ${config().environment}]`);
  }
  function isCompleted(run: Run): boolean {
    return !!run.conclusion;
  }

  const listCommand = `gh run list --workflow=${config().workflow} --repo ${config().repo} --json name,conclusion,databaseId --limit 100`;

  try {
    // Cancel the running workflows.
    const result = execSync(listCommand).toString();
    const runs = JSON.parse(result) as Array<Run>;
    for (const run of runs) {
      if (!isCompleted(run) && matchesEnvironment(run)) {
        execSync(`gh run cancel ${run.databaseId} --repo ${config().repo}`);
      }
    }

    // Wait for the workflows to stop. Give it a minute.
    // This may slightly impact the GitHub API rate limits, but cancellations
    // are quite rare operations.
    const checkAttempts = 6;
    const delay = 10_000;
    for (let checkAttempt = 1; checkAttempt <= checkAttempts; checkAttempt++) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      const result = execSync(listCommand).toString();
      const runs = JSON.parse(result) as Array<Run>;
      if (runs.every((run) => isCompleted(run) || !matchesEnvironment(run))) {
        return;
      }
    }
  } catch (error) {
    core.output$.next('Error canceling the workflow', 'error');
    logExecError(error);
  }
}

function isSpawnError(error: unknown): error is SpawnSyncReturns<Buffer> {
  return !!error && typeof error === 'object' && 'status' in error;
}

function logExecError(error: unknown): void {
  if (isSpawnError(error)) {
    core.output$.next(`Error: ${error}`);
    core.output$.next(`Exit code: ${error.status}`);
    core.output$.next(`Stdout: ${error.stdout?.toString()}`);
    core.output$.next(`Stderr: ${error.stderr?.toString()}`);
  }
  console.error(error);
}

import { saveBuildInfo } from '../../tools/database';
import { Queue, TaskJob } from '../../tools/queue';
import { core } from '../core';
import { buildDeployTask } from './build/buildDeploy';
import { buildRunTask } from './build/buildRun';
import { serveStartTask } from './serve/serveStart';

export const buildTask: () => TaskJob = () => (controller) => {
  core.state.incrementBuildNumber();
  core.state.setBuildState('InProgress');

  const startedAt = Date.now();
  const output: Array<string> = [];
  const outputSubscription = core.output$.subscribe((chunk) => {
    output.push(
      `${new Date().toISOString().substring(0, 19).replace('T', ' ')} ${chunk}`,
    );
  });
  const saveBuildLogs = (): void => {
    saveBuildInfo({
      type: core.state.getBuildNumber() === 1 ? 'full' : 'incremental',
      startedAt,
      finishedAt: Date.now(),
      success:
        core.state.getBuildJobState() === 'Success' &&
        core.state.getDeployJobState() === 'Success',
      logs: output.join(''),
    });
    outputSubscription.unsubscribe();
  };

  return new Promise((resolve) => {
    const queue = new Queue();

    controller.onCancel(async () => {
      await queue.clear();
      core.state.setBuildState('Done');
      saveBuildLogs();
      resolve(false);
    });

    queue.add({
      job: buildRunTask,
      options: { shouldStopQueueOnFailure: true },
    });

    queue.add({ job: serveStartTask });

    queue.add({ job: buildDeployTask });

    queue.run();
    // eslint-disable-next-line promise/catch-or-return,promise/always-return
    queue.whenIdle.then(() => {
      core.state.setBuildState('Done');
      saveBuildLogs();
      resolve(true);
    });
  });
};

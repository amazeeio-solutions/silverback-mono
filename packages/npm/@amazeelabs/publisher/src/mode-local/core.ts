import { Core } from '../tools/core';
import { OutputSubject } from '../tools/output';
import { Queue } from '../tools/queue';
import { state } from './state';
import { buildTask } from './tasks/build';
import { cleanRunTask } from './tasks/clean/cleanRun';
import { serveStopTask } from './tasks/serve/serveStop';
import { Process } from './tools/runner';

class CoreLocal implements Core {
  state = state;

  serveProcess: Process | null = null;

  output$ = new OutputSubject();

  queue = new Queue();

  start = () => {
    this.queue.add({ job: buildTask() });
    this.queue.run();
  };

  stop = async () => {
    await this.queue.clear();
    await this.serveProcess?.kill();
  };

  build = () => {
    // Consider any pending task a build task.
    if (!this.queue.hasPendingTasks()) {
      this.queue.add({ job: buildTask() });
    }
  };

  clean = async () => {
    await this.queue.clear();
    this.state.reset();
    this.queue.add({ job: serveStopTask });
    this.queue.add({ job: cleanRunTask });
    this.queue.add({ job: buildTask() });
  };

  getBuildNumber = () => this.state.getBuildNumber();
}

export const core = new CoreLocal();

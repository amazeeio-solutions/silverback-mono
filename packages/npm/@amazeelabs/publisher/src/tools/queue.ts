export class TaskController {
  cancelCallbacks: Array<() => void> = [];
  cancel = (): void => {
    this.cancelCallbacks.forEach((callback) => callback());
  };
  onCancel = (callback: () => void): void => {
    this.cancelCallbacks.push(callback);
  };
  offCancel = (callback: () => void): void => {
    this.cancelCallbacks = this.cancelCallbacks.filter((cb) => cb !== callback);
  };
}

export type TaskResult = Promise<boolean>;

export type TaskJob = (controller: TaskController) => TaskResult;

export type Task = {
  job: TaskJob;
  options?: { shouldStopQueueOnFailure: boolean };
};

export class Queue {
  whenIdle = Promise.resolve();

  #resolveWhenIdle = (): void => {};
  #newWhenIdlePromise = (): Promise<void> => {
    return new Promise<void>((resolve) => {
      this.#resolveWhenIdle = resolve;
    });
  };

  #started = false;
  #tasks: Array<Task> = [];
  #currentTask: {
    job: TaskResult;
    controller: TaskController;
  } | null = null;

  add = (task: Task): void => {
    if (!this.#tasks.length && !this.#currentTask) {
      this.whenIdle = this.#newWhenIdlePromise();
    }
    this.#tasks.push(task);
    if (this.#started) {
      setImmediate(this.run);
    }
  };

  run = (): void => {
    this.#started = true;
    if (this.#currentTask) {
      return;
    }
    (async (): Promise<void> => {
      while (this.#tasks.length) {
        const task = this.#tasks.shift()!;
        const controller = new TaskController();
        const job = task.job(controller);
        this.#currentTask = {
          job,
          controller,
        };
        const success = await job;
        this.#currentTask = null;
        if (!success && task.options?.shouldStopQueueOnFailure) {
          this.#tasks = [];
        }
      }
      this.#resolveWhenIdle();
    })();
  };

  clear = async (): Promise<void> => {
    this.#tasks = [];
    if (this.#currentTask) {
      this.#currentTask.controller.cancel();
      await this.#currentTask.job;
    }
  };

  hasPendingTasks = (): boolean => this.#tasks.length > 0;

  hasActiveTasks = (): boolean => !!this.#currentTask;
}

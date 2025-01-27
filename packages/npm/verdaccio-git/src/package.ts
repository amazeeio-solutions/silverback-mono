import { IUploadTarball, Logger } from '@verdaccio/types';
import fs, { readJSONSync } from 'fs-extra';
import { SimpleGit } from 'simple-git';
import * as tar from 'tar';

import { processComposerPackage } from './composer';

type GitInfo = {
  version: string;
  publishConfig: {
    repository: string;
    branch: string;
  };
};

/**
 * Verify that a package info contains git publishing information.
 *
 * @param info the parsed package.json file
 */
export const isGitPackage = (info: {
  publishConfig?: { branch?: string; repository?: string };
}): info is GitInfo =>
  !!(
    info.publishConfig &&
    info.publishConfig.branch &&
    info.publishConfig.repository
  );

/**
 * Inject a new process into writing a the package tarball.
 *
 * When writing a module package, a new process can be injected that will
 * trigger on the "success" event and delay all waiting consumers until
 * its done. Used for pushing package contents to a git repository.
 *
 * @param tarball the tarball stream
 * @param process the process to inject
 * @param logger a logger instance
 */
export const proxyTarball = (
  tarball: IUploadTarball,
  process: () => Promise<void>,
  logger: Logger,
) => {
  tarball.on = new Proxy(tarball.on, {
    apply: (target, thisArg, args) => {
      const [event, handler] = args;
      if (event === 'success') {
        return target.apply(thisArg, [
          event,
          () => {
            process()
              .then(handler)
              .catch((err) => logger.error(`[git] ${err}`));
          },
        ]);
      } else {
        return target.apply(thisArg, [event, handler]);
      }
    },
  });
  return tarball;
};

/**
 * Push a npm package to git, if it is git-enabled.
 *
 * Extracts the package, scans it for git information and commits a new release.
 *
 * @param name the package file name (e.g. test-1.0.0.tar.gz)
 * @param path the path where this file is stored
 * @param git a `SimpleGit` instance
 * @param logger a logger instance
 */
export const pushToGit = async (
  name: string,
  path: string,
  git: SimpleGit,
  logger: Logger,
) => {
  const archive = `${path}/${name}`;
  logger.info(`[git] Extracting it to ${path}.`);
  tar.extract({
    sync: true,
    file: archive,
    cwd: path,
  });

  const info = readJSONSync(`${path}/package/package.json`);

  if (isGitPackage(info)) {
    logger.info(
      `[git] Cloning target repository ${info.publishConfig.repository} to ${path}/clone.`,
    );

    await git.clone(info.publishConfig.repository, `${path}/clone`);
    await git.cwd(`${path}/clone`);
    await git.checkout(info.publishConfig.branch);

    fs.copySync(`${path}/clone/.git`, `${path}/package/.git`);

    processComposerPackage(`${path}/package`);
    logger.info(
      `[git] Commiting version ${info.version} and pushing to ${info.publishConfig.repository}#${info.publishConfig.branch}.`,
    );

    await git.cwd(`${path}/package`);
    await git.add(['./*']);
    await git.commit(`chore: release version ${info.version}`);
    await git.addTag(info.version);
    await git.push('origin', info.publishConfig.branch);
    await git.pushTags('origin');
  } else {
    logger.warn(
      `[git] Skipping package ${name} because it has no remote repository config.`,
    );
  }
};

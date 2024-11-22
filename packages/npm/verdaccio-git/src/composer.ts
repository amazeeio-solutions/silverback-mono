import fs, { outputJSONSync, readJSONSync } from 'fs-extra';

/**
 * Align composer and npm information.
 *
 * Processes versioning information from package.json and merges it into composer.json
 * to manage dependencies and versioning of composer packages with lerna.
 *
 * 1. clears out composer.lock files
 * 2. sets composer package version to equal npm
 * 3. aligns all dependency versions of other maintained composer packages
 * 4. removes composer-only dependencies from package.json
 * 5. removes local repository definitions from composer.json
 *
 * @param path The path to the package directory.
 */
export const processComposerPackage = (path: string) => {
  if (isComposerPackage(path)) {
    removeComposerLock(path);
    setComposerPackageVersion(path);
    setComposerDependencyVersions(path);
    cleanNpmDependencies(path);
    removeLocalComposerRepository(path);
  }
};

/**
 * Check if a given path is a composer package.
 *
 * @param path
 */
export const isComposerPackage = (path: string) => {
  return fs.existsSync(`${path}/composer.json`);
};

/**
 * Remove the composer.lock if there is one in a given path.
 *
 * @param path
 */
export const removeComposerLock = (path: string) => {
  if (fs.existsSync(`${path}/composer.lock`)) {
    fs.removeSync(`${path}/composer.lock`);
  }
};

/**
 * Copy the assigned package version from package.json to composer.json.
 *
 * @param path
 */
export const setComposerPackageVersion = (path: string) => {
  const composer = readJSONSync(`${path}/composer.json`);
  const npm = readJSONSync(`${path}/package.json`);
  composer.version = npm.version;
  outputJSONSync(`${path}/composer.json`, composer, { spaces: 2 });
};

/**
 * Remove any "path" repositories used for local development.
 *
 * @param path
 */
export const removeLocalComposerRepository = (path: string) => {
  const composer = readJSONSync(`${path}/composer.json`);
  if (composer.repositories) {
    composer.repositories = composer.repositories.filter(
      (rep: { type: string }) => rep.type !== 'path',
    );
    outputJSONSync(`${path}/composer.json`, composer, { spaces: 2 });
  }
};

/**
 * Search for composer dependency versions maintained by lerna in package.json.
 *
 * Searches for all composer packages (starting with "@-") in package.json and set the
 * according required version in composer.json.
 *
 * @param path
 */
export const setComposerDependencyVersions = (path: string) => {
  const composer = readJSONSync(`${path}/composer.json`);
  const npm = readJSONSync(`${path}/package.json`);
  if (composer.require && npm.dependencies) {
    Object.keys(composer.require).forEach((dep) => {
      if (npm.dependencies[`@-${dep}`]) {
        composer.require[dep] = npm.dependencies[`@-${dep}`];
      }
    });
    outputJSONSync(`${path}/composer.json`, composer, { spaces: 2 });
  }
};

/**
 * Remove all composer dependencies from package.json.
 *
 * Searches for all composer packages (starting with "@-") in package.json and removes
 * them.
 *
 * @param path
 */
export const cleanNpmDependencies = (path: string) => {
  const npm = readJSONSync(`${path}/package.json`);
  if (npm.dependencies) {
    const deps: { [key: string]: string } = {};
    Object.keys(npm.dependencies).forEach((key) => {
      if (key.substr(0, 2) !== '@-') {
        deps[key] = npm.dependencies[key];
      }
    });
    npm.dependencies = deps;
    outputJSONSync(`${path}/package.json`, npm, { spaces: 2 });
  }
};

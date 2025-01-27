import { IUploadTarball, Logger } from '@verdaccio/types';
import fs from 'fs-extra';
import mock from 'mock-fs';
import { SimpleGit } from 'simple-git';
import * as tar from 'tar';

import * as composer from '../composer';
import { isGitPackage, proxyTarball, pushToGit } from '../package';

jest.mock('tar');

afterEach(mock.restore);

describe('isGitPackage', () => {
  it('returns true if there is a complete git information in "publishConfig" ', () => {
    expect(
      isGitPackage({
        publishConfig: {
          branch: 'development',
          repository: 'https://github.com/amazeelabs/silverback',
        },
      }),
    ).toBe(true);
  });

  it('returns false if there is no git information in "publishConfig"', () => {
    expect(
      isGitPackage({
        publishConfig: {},
      }),
    ).toBe(false);
  });

  it('returns false if there is an incomplete git information in "publishConfig"', () => {
    expect(
      isGitPackage({
        publishConfig: {
          branch: 'development',
        },
      }),
    ).toBe(false);
  });
});

describe('proxyTarball', () => {
  const process = jest.fn();
  const handler = jest.fn();
  const logger = {
    error: jest.fn(),
  };
  const tarball = {
    on: (_: string, handler: () => void) => {
      handler();
    },
  };

  beforeEach(jest.resetAllMocks);

  it('it does not inject the process for other events', () => {
    process.mockResolvedValue(undefined);
    handler.mockReturnValue(undefined);
    const proxy = proxyTarball(
      tarball as unknown as IUploadTarball,
      process,
      logger as unknown as Logger,
    );
    proxy.on('start', handler);
    proxy.on('success', () => {
      expect(process).toHaveBeenCalledTimes(0);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  it('it injects the process for "success" events', () => {
    process.mockResolvedValue(undefined);
    handler.mockReturnValue(undefined);
    const proxy = proxyTarball(
      tarball as unknown as IUploadTarball,
      process,
      logger as unknown as Logger,
    );
    proxy.on('success', handler);
    proxy.on('success', () => {
      expect(process).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  it('it logs an error if one happens', () => {
    process.mockReturnValue(
      new Promise((resolve, reject) => {
        reject('BOOM!');
      }),
    );
    handler.mockReturnValue(undefined);
    const proxy = proxyTarball(
      tarball as unknown as IUploadTarball,
      process,
      logger as unknown as Logger,
    );
    proxy.on('success', handler);
    proxy.on('success', () => {
      expect(process).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('[git] BOOM!');
    });
  });
});

describe('pushToGit', () => {
  beforeEach(jest.resetAllMocks);

  it('skips packages without git publish info', async () => {
    const composerSpy = jest.spyOn(composer, 'processComposerPackage');
    const extractSpy = jest.spyOn(tar, 'extract');
    const git = {};
    const logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };
    mock({
      test: {
        package: {
          'package.json': '{}',
        },
      },
    });
    await pushToGit(
      'test-1.0.1.tar.gz',
      'test',
      git as SimpleGit,
      logger as unknown as Logger,
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(composerSpy).toHaveBeenCalledTimes(0);
    expect(extractSpy).toHaveBeenCalledWith({
      sync: true,
      file: 'test/test-1.0.1.tar.gz',
      cwd: 'test',
    });
  });

  it('it processes the package if there is git info', async () => {
    const composerSpy = jest.spyOn(composer, 'processComposerPackage');
    const extractSpy = jest.spyOn(tar, 'extract');
    const git = {
      clone: jest.fn(),
      checkout: jest.fn(),
      cwd: jest.fn(),
      add: jest.fn(),
      commit: jest.fn(),
      addTag: jest.fn(),
      push: jest.fn(),
      pushTags: jest.fn(),
    };
    const logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };
    mock({
      test: {
        package: {
          'package.json':
            '{"version": "1.0.1", "publishConfig": {"repository": "foo", "branch":"bar"}}',
        },
        clone: {
          '.git': 'test',
        },
      },
    });
    await pushToGit(
      'test-1.0.1.tar.gz',
      'test',
      git as unknown as SimpleGit,
      logger as unknown as Logger,
    );
    expect(logger.warn).toHaveBeenCalledTimes(0);
    expect(logger.info).toHaveBeenCalledTimes(3);
    expect(git.clone).toHaveBeenCalledTimes(1);
    expect(git.clone).toHaveBeenCalledWith('foo', 'test/clone');
    expect(git.checkout).toHaveBeenCalledWith('bar');
    expect(git.cwd).toHaveBeenCalledWith('test/clone');
    expect(git.cwd).toHaveBeenCalledWith('test/package');
    expect(git.add).toHaveBeenCalledWith(['./*']);
    expect(git.commit).toHaveBeenCalledWith('chore: release version 1.0.1');
    expect(git.addTag).toHaveBeenCalledWith('1.0.1');
    expect(git.push).toHaveBeenCalledWith('origin', 'bar');
    expect(git.pushTags).toHaveBeenCalledWith('origin');
    expect(composerSpy).toHaveBeenCalledWith('test/package');
    expect(extractSpy).toHaveBeenCalledWith({
      sync: true,
      file: 'test/test-1.0.1.tar.gz',
      cwd: 'test',
    });
    expect(fs.readFileSync('test/package/.git').toString()).toEqual('test');
  });
});

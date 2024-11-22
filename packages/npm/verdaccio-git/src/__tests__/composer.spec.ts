import fs, { readJSONSync } from 'fs-extra';
import mock from 'mock-fs';

import {
  cleanNpmDependencies,
  isComposerPackage,
  processComposerPackage,
  removeComposerLock,
  removeLocalComposerRepository,
  setComposerDependencyVersions,
  setComposerPackageVersion,
} from '../composer';

afterEach(() => {
  mock.restore();
});

describe('isComposerPackage', () => {
  it('returns true if there is a composer.json', () => {
    mock({
      test: {
        'package.json': '{}',
        'composer.json': '{}',
      },
    });
    expect(isComposerPackage('test')).toBe(true);
  });

  it('returns false if there is no composer.json', () => {
    mock({
      test: {
        'package.json': '{}',
      },
    });
    expect(isComposerPackage('test')).toBe(false);
  });
});

describe('removeComposerLock', () => {
  it('does not fail if composer.lock does not exist', () => {
    mock({
      test: {
        'composer.json': '{}',
      },
    });
    expect(() => removeComposerLock('test')).not.toThrow();
  });
  it('removes composer.lock if there is one', () => {
    mock({
      test: {
        'composer.json': '{}',
        'composer.lock': '{}',
      },
    });
    removeComposerLock('test');
    expect(fs.existsSync('test/composer.lock')).toBe(false);
  });
});

describe('setComposerPackageVersion', () => {
  it('sets the version number from package.json', () => {
    mock({
      test: {
        'package.json': '{"version": "1.0.1"}',
        'composer.json': '{"version": "1.0.0"}',
      },
    });
    setComposerPackageVersion('test');
    expect(readJSONSync('test/composer.json').version).toEqual('1.0.1');
  });
});

describe('removeLocalComposerRepository', () => {
  it('removes all path repositories from composer.json', () => {
    mock({
      test: {
        'composer.json': '{"repositories": [{"type": "path", "url": "foo"}]}',
      },
    });
    removeLocalComposerRepository('test');
    expect(readJSONSync('test/composer.json').repositories).toHaveLength(0);
  });

  it('leaves other repositories intact', () => {
    mock({
      test: {
        'composer.json':
          '{"repositories": [{"type": "path", "url": "foo"},{"type": "vcs", "url": "bar"}]}',
      },
    });
    removeLocalComposerRepository('test');
    expect(readJSONSync('test/composer.json').repositories).toHaveLength(1);
  });
});

describe('setComposerDependencyVersions', () => {
  it('it copies matching versions from package.json', () => {
    mock({
      test: {
        'package.json': JSON.stringify({
          dependencies: {
            '@-amazeelabs/test': '1.0.1',
          },
        }),
        'composer.json': JSON.stringify({
          require: {
            'amazeelabs/test': '@dev',
          },
        }),
      },
    });
    setComposerDependencyVersions('test');
    expect(
      readJSONSync('test/composer.json').require['amazeelabs/test'],
    ).toEqual('1.0.1');
  });

  it('it leaves other dependencies intact', () => {
    mock({
      test: {
        'package.json': JSON.stringify({
          dependencies: {
            '@-amazeelabs/test': '1.0.1',
          },
        }),
        'composer.json': JSON.stringify({
          require: {
            'amazeelabs/test': '@dev',
            'psr/log': '^1.0.1',
          },
        }),
      },
    });
    setComposerDependencyVersions('test');
    expect(readJSONSync('test/composer.json').require['psr/log']).toEqual(
      '^1.0.1',
    );
  });
});

describe('cleanNpmDependencies', () => {
  it('removes all composer dependencies', () => {
    mock({
      test: {
        'package.json': JSON.stringify({
          dependencies: {
            lodash: '1.0.0',
            '@-amazeelabs/test': '1.0.1',
          },
        }),
      },
    });
    cleanNpmDependencies('test');
    expect(readJSONSync('test/package.json').dependencies['lodash']).toEqual(
      '1.0.0',
    );

    expect(readJSONSync('test/package.json').dependencies).not.toHaveProperty(
      '@-amazeelabs/test',
    );
  });
});

describe('processComposerPackage', () => {
  it('skips if there is no composer.json', () => {
    mock({
      test: {
        'composer.lock': '{}',
      },
    });
    processComposerPackage('test');
    expect(fs.existsSync('test/composer.lock')).toBe(true);
  });
  it('invokes all processes if there is no composer.json', () => {
    mock({
      test: {
        'package.json': '{}',
        'composer.json': '{}',
        'composer.lock': '{}',
      },
    });
    processComposerPackage('test');
    expect(fs.existsSync('test/composer.lock')).toBe(false);
  });
});

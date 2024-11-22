import { buildSchema } from 'graphql';
import { describe, expect, it } from 'vitest';

import {
  contextSuggestions,
  extractDocstrings,
  extractImplementations,
  generateAutoloader,
  printDrupalAutoload,
  printJsAutoload,
  printJSONAutoload,
  selectImplementation,
} from './lib';

describe('extractDocstrings', () => {
  it('returns an empty dictionary if there are no docstrings', () => {
    expect(
      extractDocstrings(
        buildSchema(`directive @myDirective on FIELD_DEFINITION`),
      ),
    ).toEqual({});
  });
  it('returns a docstring for a directive', () => {
    expect(
      extractDocstrings(
        buildSchema(`
            """
            This is a comment
            """
            directive @myDirective on FIELD_DEFINITION
            directive @anotherDirective on FIELD_DEFINITION
          `),
      ),
    ).toEqual({ myDirective: 'This is a comment' });
  });
});

describe('extractImplementations', () => {
  it('returns an empty dictionary if there are no implementations', () => {
    expect(extractImplementations('')).toEqual({});
  });

  it('ignores empty docstrings', () => {
    expect(
      extractImplementations(['This is some unrelated comment'].join('\n')),
    ).toEqual({});
  });

  it('extracts a single default implementation', () => {
    expect(
      extractImplementations(
        [
          'This is some other comment content',
          '',
          'implementation: @my/package#function',
        ].join('\n'),
      ),
    ).toEqual({ '': '@my/package#function' });
  });

  it('prefers the last implementation', () => {
    expect(
      extractImplementations(
        [
          'This is some other comment content',
          '',
          'implementation: @my/package#a',
          'implementation: @my/package#b',
        ].join('\n'),
      ),
    ).toEqual({ '': '@my/package#b' });
  });

  it('extracts contextual implementations', () => {
    expect(
      extractImplementations(
        [
          'This is some other comment content',
          '',
          'implementation: @my/package#a',
          'implementation(gatsby): @my/package#b',
        ].join('\n'),
      ),
    ).toEqual({
      '': '@my/package#a',
      gatsby: '@my/package#b',
    });
  });

  it('prefers the last implementation of a context', () => {
    expect(
      extractImplementations(
        [
          'This is some other comment content',
          '',
          'implementation(gatsby): @my/package#a',
          'implementation(gatsby): @my/package#b',
          'implementation: @my/package#c',
        ].join('\n'),
      ),
    ).toEqual({
      '': '@my/package#c',
      gatsby: '@my/package#b',
    });
  });
});

describe('contextSuggestions', () => {
  it('returns an empty list if there are no contexts', () => {
    expect(contextSuggestions([])).toEqual([]);
  });
  it('returns a single context', () => {
    expect(contextSuggestions(['gatsby'])).toEqual(['gatsby']);
  });
  it('creates combined contexts, ordered by specificity', () => {
    expect(contextSuggestions(['remix', 'gatsby', 'drupal'])).toEqual([
      'drupal:gatsby:remix',
      'drupal:gatsby',
      'drupal:remix',
      'gatsby:remix',
      'drupal',
      'gatsby',
      'remix',
    ]);
  });
});

describe('selectImplementation', () => {
  it('falls back to the default implementation if the context does not match', () => {
    expect(
      selectImplementation(['gatsby'])({
        '': '@my/package#a',
      }),
    ).toEqual('@my/package#a');
  });

  it('returns the implementation for the context if it exists', () => {
    expect(
      selectImplementation(['gatsby'])({
        '': '@my/package#a',
        gatsby: '@my/package#b',
      }),
    ).toEqual('@my/package#b');
  });

  it('returns undefined if there is no match and no default implementation', () => {
    expect(
      selectImplementation(['gatsby'])({
        nextjs: '@my/package#b',
      }),
    ).toEqual(undefined);
  });

  it('matches implementations that require multiple contexts', () => {
    expect(
      selectImplementation(['gatsby', 'cloudinary'])({
        'gatsby:cloudinary': '@my/package#b',
      }),
    ).toEqual('@my/package#b');
    expect(
      selectImplementation(['gatsby'])({
        'gatsby:cloudinary': '@my/package#b',
      }),
    ).toEqual(undefined);
  });
});

describe('printJsAutoload', () => {
  it('prints an empty object if there are no implementations', () => {
    expect(printJsAutoload({})).toEqual('export default {\n};');
  });

  it('prints a single default implementation', () => {
    expect(
      printJsAutoload({
        myDirective: '@my/package#function',
      }),
    ).toEqual(
      [
        'import { function as al0 } from "@my/package";',
        'export default {',
        '  myDirective: al0,',
        '};',
      ].join('\n'),
    );
  });
});

describe('printJSONAutoload', () => {
  it('prints an empty object if there are no implementations', () => {
    expect(printJSONAutoload({})).toEqual('{}');
  });

  it('prints a single default implementation', () => {
    expect(
      printJSONAutoload({
        myDirective: '@my/package#function',
      }),
    ).toEqual(
      JSON.stringify(
        {
          myDirective: {
            package: '@my/package',
            export: 'function',
          },
        },
        null,
        2,
      ),
    );
  });
});

describe('printDrupalAutoload', () => {
  it('prints an empty object if there are no implementations', () => {
    expect(printDrupalAutoload({})).toEqual(JSON.stringify({}, null, 2));
  });

  it('prints static method resolvers', () => {
    expect(
      printDrupalAutoload({
        myDirective: '\\Drupal\\my_module\\SomeClass::function',
      }),
    ).toEqual(
      JSON.stringify(
        {
          myDirective: {
            class: '\\Drupal\\my_module\\SomeClass',
            method: 'function',
          },
        },
        null,
        2,
      ),
    );
  });

  it('prints symfony service resolvers', () => {
    expect(
      printDrupalAutoload({
        myDirective: 'my.service::function',
      }),
    ).toEqual(
      JSON.stringify(
        {
          myDirective: {
            service: 'my.service',
            method: 'function',
          },
        },
        null,
        2,
      ),
    );
  });
});

describe('generateAutoloader', () => {
  it('generates an empty autoloader if there are no directives', () => {
    expect(
      generateAutoloader(
        buildSchema(`type Query { hello: String! }`),
        ['gatsby'],
        printJsAutoload,
      ),
    ).toEqual(`export default {\n};`);
  });

  it('generates an autoloader with a single directive', () => {
    expect(
      generateAutoloader(
        buildSchema(
          [
            '"""',
            'This is a comment',
            '',
            'implementation: @my/package#function',
            '"""',
            'directive @myDirective on FIELD_DEFINITION',
            'directive @whatever on FIELD_DEFINITION',
          ].join('\n'),
        ),
        ['gatsby'],
        printJsAutoload,
      ),
    ).toEqual(
      [
        'import { function as al0 } from "@my/package";',
        'export default {',
        '  myDirective: al0,',
        '};',
      ].join('\n'),
    );
  });

  it('generates an autoloader with multiple directives', () => {
    expect(
      generateAutoloader(
        buildSchema(
          [
            '"""',
            'This is a comment',
            '',
            'implementation: @my/package#a',
            '"""',
            'directive @myDirective on FIELD_DEFINITION',
            '',
            '"""',
            'This is another comment',
            '',
            'implementation: @my/package#b',
            '"""',
            'directive @anotherDirective on FIELD_DEFINITION',
            'directive @whatever on FIELD_DEFINITION',
          ].join('\n'),
        ),
        ['gatsby'],
        printJsAutoload,
      ),
    ).toEqual(
      [
        'import { a as al0 } from "@my/package";',
        'import { b as al1 } from "@my/package";',
        'export default {',
        '  myDirective: al0,',
        '  anotherDirective: al1,',
        '};',
      ].join('\n'),
    );
  });

  it('generates an autoloader with multiple directives and contexts', () => {
    expect(
      generateAutoloader(
        buildSchema(
          [
            '"""',
            'This is a comment',
            '',
            'implementation: @my/package#function',
            '"""',
            'directive @myDirective on FIELD_DEFINITION',
            '',
            '"""',
            'This is another comment',
            '',
            'implementation: @my/package#generic',
            'implementation(gatsby:cloudinary): @my/package#gatsby',
            '"""',
            'directive @anotherDirective on FIELD_DEFINITION',
            '"""',
            'This is a third comment',
            '"""',
            'directive @whatever on FIELD_DEFINITION',
          ].join('\n'),
        ),
        ['gatsby', 'cloudinary'],
        printJsAutoload,
      ),
    ).toEqual(
      [
        'import { function as al0 } from "@my/package";',
        'import { gatsby as al1 } from "@my/package";',
        'export default {',
        '  myDirective: al0,',
        '  anotherDirective: al1,',
        '};',
      ].join('\n'),
    );
  });
});

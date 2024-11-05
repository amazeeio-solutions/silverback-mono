import {
  DefinitionNode,
  FragmentDefinitionNode,
  Kind,
  OperationDefinitionNode,
  parse,
} from 'graphql';
import { describe, expect, it } from 'vitest';

import { scanFragments } from './scan';

function isFragmentDefinitionNode(
  def: DefinitionNode,
): def is FragmentDefinitionNode {
  return def.kind === Kind.FRAGMENT_DEFINITION;
}

function isOperationDefinitionNode(
  def: DefinitionNode,
): def is OperationDefinitionNode {
  return def.kind === Kind.OPERATION_DEFINITION;
}

describe('scanFragments', () => {
  it('detects a fragment on a query', () => {
    const doc = parse(`
  query {
      ...A
  }
  fragment A on Query {
    myprop
  }
  `);
    const [query] = doc.definitions.filter(isOperationDefinitionNode);
    const [A] = doc.definitions.filter(isFragmentDefinitionNode);
    const fragments = scanFragments(query, new Map(Object.entries({ A })));
    expect(fragments).toEqual(['A']);
  });

  it('detects a fragment on a field', () => {
    const doc = parse(`
  query {
    a {
      ...A
    }
  }
  fragment A on A {
    myprop
  }
  `);
    const [query] = doc.definitions.filter(isOperationDefinitionNode);
    const [A] = doc.definitions.filter(isFragmentDefinitionNode);
    const fragments = scanFragments(query, new Map(Object.entries({ A })));
    expect(fragments).toEqual(['A']);
  });

  it('detects nested fragments', () => {
    const doc = parse(`query {
  a {
    propA
    ...A
  }
}
fragment A on A {
  propA
  propB {
    ...B
  }
}
fragment B on B {
  propC
}`);
    const [query] = doc.definitions.filter(isOperationDefinitionNode);
    const [A, B] = doc.definitions.filter(isFragmentDefinitionNode);
    const fragments = scanFragments(query, new Map(Object.entries({ A, B })));
    expect(fragments).toEqual(['A', 'B']);
  });
  it('detects mixed fragments', () => {
    const doc = parse(`query {
  a {
    propA
    ... on A {
      propB {
        ...B
      }
    }
  }
}
fragment B on B {
  ...C
}
fragment C on B {
  ...D
}
fragment D on B {
  ...E
}
fragment E on B {
  propC
}
`);
    const [query] = doc.definitions.filter(isOperationDefinitionNode);
    const [B, C, D, E] = doc.definitions.filter(isFragmentDefinitionNode);
    const fragments = scanFragments(
      query,
      new Map(Object.entries({ B, C, D, E })),
    );
    expect(fragments).toEqual(['B', 'C', 'D', 'E']);
  });
});

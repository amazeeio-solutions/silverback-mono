import { Types } from '@graphql-codegen/plugin-helpers';
import { buildSchema, parse } from 'graphql';
import { describe, expect, it } from 'vitest';

import { plugin } from './';

const schema = buildSchema(`
  type Query {
    loadPage(path: String!): Page
  }
  type Mutation {
    login(username: String!, password: String!): Boolean!
  }
  type Page {
    title: String!
    path: String!
    related: [Page!]!
  }
  `);

describe('mode: map', () => {
  function runPlugin(
    documents: Array<Types.DocumentFile>,
    mode: 'inline' | 'attach' | undefined = 'inline',
  ) {
    return plugin(
      schema,
      documents,
      { fragments: mode },
      { outputFile: 'map.json' },
    );
  }

  it('creates a map entry for a single operation', async () => {
    const result = await runPlugin([
      {
        location: 'queries.gql',
        document: parse(`query Home { loadPage(path: "/") { title } }`),
        schema,
      },
    ]);
    expect(JSON.parse(result)).toMatchInlineSnapshot(`
      {
        "HomeQuery:37b18153e5d5ac538e6f4b371203b73e0b273d9ea2cd26c8b8eeed655c229db6": "query Home {
        loadPage(path: "/") {
          title
        }
      }",
      }
    `);
  });

  it('creates map entries for multiple operations in one document', async () => {
    const result = await runPlugin([
      {
        location: 'queries.gql',
        document: parse(`
        query Home { loadPage(path: "/") { title } }
        query Sitemap { loadPage(path: "/sitemap") { title } }
        `),
        schema,
      },
    ]);
    expect(JSON.parse(result)).toMatchInlineSnapshot(`
      {
        "HomeQuery:37b18153e5d5ac538e6f4b371203b73e0b273d9ea2cd26c8b8eeed655c229db6": "query Home {
        loadPage(path: "/") {
          title
        }
      }",
        "SitemapQuery:58d3e46159d03193c571a8d6d2101a93456902d63a9b9d8c925f7d4cb8c69b0a": "query Sitemap {
        loadPage(path: "/sitemap") {
          title
        }
      }",
      }
    `);
  });

  it('creates map entries for multiple operations in multiple documents', async () => {
    const result = await runPlugin([
      {
        location: 'a.gql',
        document: parse(`
        query Home { loadPage(path: "/") { title } }
        `),
        schema,
      },
      {
        location: 'b.gql',
        document: parse(`
        query Sitemap { loadPage(path: "/sitemap") { title } }
        `),
        schema,
      },
    ]);
    expect(JSON.parse(result)).toMatchInlineSnapshot(`
      {
        "HomeQuery:37b18153e5d5ac538e6f4b371203b73e0b273d9ea2cd26c8b8eeed655c229db6": "query Home {
        loadPage(path: "/") {
          title
        }
      }",
        "SitemapQuery:58d3e46159d03193c571a8d6d2101a93456902d63a9b9d8c925f7d4cb8c69b0a": "query Sitemap {
        loadPage(path: "/sitemap") {
          title
        }
      }",
      }
    `);
  });

  it('ignores unused fragments', async () => {
    const result = await runPlugin([
      {
        location: 'a.gql',
        document: parse(`
        fragment Page on Page { title }
        query Home { loadPage(path: "/") { title } }
        `),
      },
    ]);
    expect(JSON.parse(result)).toMatchInlineSnapshot(`
      {
        "HomeQuery:37b18153e5d5ac538e6f4b371203b73e0b273d9ea2cd26c8b8eeed655c229db6": "query Home {
        loadPage(path: "/") {
          title
        }
      }",
      }
    `);
  });

  it('adds used fragments inline', async () => {
    const result = await runPlugin([
      {
        location: 'a.gql',
        document: parse(`
        fragment Page on Page { title }
        query Home { loadPage(path: "/") { ...Page } }
        `),
      },
    ]);
    expect(JSON.parse(result)).toMatchInlineSnapshot(`
      {
        "HomeQuery:dc086da112964a8f85ae0520dab3fa68a84e067ee6aa8b0e06305f4cb5e9898a": "query Home {
        loadPage(path: "/") {
          ... on Page {
            title
          }
        }
      }",
      }
    `);
  });

  it('attaches used fragments', async () => {
    const result = await runPlugin([
      {
        location: 'a.gql',
        document: parse(`
        fragment Page on Page { title }
        query Home { loadPage(path: "/") { ...Page } }
        `),
      },
    ]);
    expect(JSON.parse(result)).toMatchInlineSnapshot(`
      {
        "HomeQuery:dc086da112964a8f85ae0520dab3fa68a84e067ee6aa8b0e06305f4cb5e9898a": "query Home {
        loadPage(path: "/") {
          ... on Page {
            title
          }
        }
      }",
      }
    `);
  });

  it('inlines multiple invocations', async () => {
    const result = await runPlugin([
      {
        location: 'a.gql',
        document: parse(`
        fragment Page on Page { title, related { path } }
        fragment Teaser on Page { path }
        query Home {
          loadPage(path: "/") {
            ...Page,
            related {
              ...Page
              ...Teaser
            }
          }
        }
        `),
      },
    ]);
    expect(JSON.parse(result)).toMatchInlineSnapshot(`
      {
        "HomeQuery:9e615243c0c61d86531091aa395544df99db822d94d50a761c2809d61caf3164": "query Home {
        loadPage(path: "/") {
          ... on Page {
            title
            related {
              path
            }
          }
          related {
            ... on Page {
              title
              related {
                path
              }
            }
            ... on Page {
              path
            }
          }
        }
      }",
      }
    `);
  });

  it('attaches multiple invocations', async () => {
    const result = await runPlugin(
      [
        {
          location: 'a.gql',
          document: parse(`
        fragment Page on Page { title, related { path } }
        fragment Teaser on Page { path }
        query Home {
          loadPage(path: "/") {
            ...Page,
            related {
              ...Page
              ...Teaser
            }
          }
        }
        `),
        },
      ],
      'attach',
    );
    expect(JSON.parse(result)).toMatchInlineSnapshot(`
      {
        "HomeQuery:9e615243c0c61d86531091aa395544df99db822d94d50a761c2809d61caf3164": "query Home {
        loadPage(path: "/") {
          ...Page
          related {
            ...Page
            ...Teaser
          }
        }
      }
      fragment Page on Page {
        title
        related {
          path
        }
      }
      fragment Page on Page {
        title
        related {
          path
        }
      }
      fragment Teaser on Page {
        path
      }",
      }
    `);
  });

  it('adds nested fragments', async () => {
    const result = await runPlugin([
      {
        location: 'a.gql',
        document: parse(`
        fragment RelatedPage on Page { title }
        fragment Page on Page { title, related { ...RelatedPage } }
        query Home {
          loadPage(path: "/") {
            ...Page,
          }
        }
        `),
      },
    ]);
    expect(JSON.parse(result)).toMatchInlineSnapshot(`
      {
        "HomeQuery:7f81601e1df0c179be7354f3f834201b9615d0ea191d4ba5f83bb45b0bfe052d": "query Home {
        loadPage(path: "/") {
          ... on Page {
            title
            related {
              ... on Page {
                title
              }
            }
          }
        }
      }",
      }
    `);
  });

  it('attaches nested fragments', async () => {
    const result = await runPlugin(
      [
        {
          location: 'a.gql',
          document: parse(`
        fragment RelatedPage on Page { title }
        fragment Page on Page { title, related { ...RelatedPage } }
        query Home {
          loadPage(path: "/") {
            ...Page,
          }
        }
        `),
        },
      ],
      'attach',
    );
    expect(JSON.parse(result)).toMatchInlineSnapshot(`
      {
        "HomeQuery:7f81601e1df0c179be7354f3f834201b9615d0ea191d4ba5f83bb45b0bfe052d": "query Home {
        loadPage(path: "/") {
          ...Page
        }
      }
      fragment Page on Page {
        title
        related {
          ...RelatedPage
        }
      }
      fragment RelatedPage on Page {
        title
      }",
      }
    `);
  });

  it('adds fragments from different documents', async () => {
    const result = await runPlugin([
      {
        location: 'a.gql',
        document: parse(`
        query Home {
          loadPage(path: "/") {
            ...Page,
          }
        }
        `),
      },
      {
        location: 'b.gql',
        document: parse(`
        fragment Page on Page { title }
        `),
      },
    ]);
    expect(JSON.parse(result)).toMatchInlineSnapshot(`
      {
        "HomeQuery:dc086da112964a8f85ae0520dab3fa68a84e067ee6aa8b0e06305f4cb5e9898a": "query Home {
        loadPage(path: "/") {
          ... on Page {
            title
          }
        }
      }",
      }
    `);
  });

  it('adds nested fragments from different documents', async () => {
    const result = await runPlugin([
      {
        location: 'a.gql',
        document: parse(`
        query Home {
          loadPage(path: "/") {
            ...Page,
          }
        }
        `),
      },
      {
        location: 'b.gql',
        document: parse(`
        fragment Page on Page { title, related { ...RelatedPage } }
        `),
      },
      {
        location: 'c.gql',
        document: parse(`
        fragment RelatedPage on Page { title }
        `),
      },
    ]);
    expect(JSON.parse(result)).toMatchInlineSnapshot(`
      {
        "HomeQuery:7f81601e1df0c179be7354f3f834201b9615d0ea191d4ba5f83bb45b0bfe052d": "query Home {
        loadPage(path: "/") {
          ... on Page {
            title
            related {
              ... on Page {
                title
              }
            }
          }
        }
      }",
      }
    `);
  });
});

describe('mode: ids', () => {
  function runPlugin(documents: Array<Types.DocumentFile>) {
    return plugin(schema, documents, {}, { outputFile: 'output.ts' });
  }
  it("adds utility types for working with operation id's", async () => {
    const result = await runPlugin([]);
    expect(result).toMatchInlineSnapshot(
      `"import type { OperationId } from '@amazeelabs/codegen-operation-ids';"`,
    );
  });

  it('creates a typed id for each query', async () => {
    const result = await runPlugin([
      {
        location: 'queries.gql',
        document: parse(`
        fragment Page on Page { title }
        query Home { loadPage(path: "/") { ... Page } }
        `),
        schema,
      },
    ]);
    expect(result).toMatchInlineSnapshot(`
      "import type { OperationId } from '@amazeelabs/codegen-operation-ids';
      export const HomeQuery = "HomeQuery:37d40553a898c4026ba372c8f42af3df9c3451953b65695b823a8e1e7b5fd90d" as OperationId<HomeQuery,HomeQueryVariables | undefined>;"
    `);
  });

  it('creates a typed id for each mutation', async () => {
    const result = await runPlugin([
      {
        location: 'mutations.gql',
        document: parse(`
        mutation Login ($username: String!, $password: String!) {
          login(username: $username, password: $password)
        }
        `),
        schema,
      },
    ]);
    expect(result).toMatchInlineSnapshot(`
      "import type { OperationId } from '@amazeelabs/codegen-operation-ids';
      export const LoginMutation = "LoginMutation:10f1c5ac787ce93e9fe860ec9bb4a552967778d3873fbec2ce15fad2164da315" as OperationId<LoginMutation,LoginMutationVariables>;"
    `);
  });
});

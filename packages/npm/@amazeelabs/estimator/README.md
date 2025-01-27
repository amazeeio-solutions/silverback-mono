Last working version: f0ae4b0c792bdfb7c8612fc508dae22612a32b64

# Amazeelabs Estimator

The `@amazeelabs/estimator` package allows to assess and monitor a projects
complexity based on its GraphQL schema definitions and operations. It counts
occurences of certain GraphQL features (type definitions, fields, queries,
mutations, etc.) and calculates a complexity score based on these counts.

Then it connects to the
[Amazeelabs Dashboard](https://dashboard.amazeelabs.com), which allows track
complexity over time and relate it to work time consumed on this project.

It also provides a command to predict the efforts needed to implement a new
feature based on GraphQL changes.

## Installation

```bash
npm install -g @amazeelabs/estimator
```

## Configuration

Create configuration in a
[cosmiconfig](https://www.npmjs.com/package/cosmiconfig) compatible format.

```typescript
// estimator.config.ts
export default {
  documents: [
    'packages/schema/src/fragments/**/*.{gql,graphql}',
    'packages/schema/src/operations/*.{gql,graphql}',
    'packages/schema/src/schema.graphql',
  ],
  storage: {
    id: process.env.JIRA_PROJECT_ID,
    token: process.env.DASHBOARD_ACCESS_TOKEN,
    api: 'https://dashboard.amazeelabs.com/api/estimator',
  },
};
```

Please consult the
[configuration schema](https://github.com/AmazeeLabs/silverback-mono/blob/development/packages/npm/%40amazeelabs/estimator/src/configschema.ts)
for a full list of available options.

## How it works

The estimator reads the GraphQL schema and operations from the provided
documents and counts the occurences of certain features. It then calculates a
complexity score based on these counts and a set of weights that can also be
configured.

import { expect, test } from 'vitest';

import { scan } from './scan.js';

test('nothing', async ({ effectValue }) => {
  const result = await effectValue(scan);
  expect(result).toEqual([]);
});

test('full', async ({ repo, effectValue }) => {
  await repo.write('.estimatorrc.yml', 'documents: ["**/*.{ts,graphqls,gql}"]');
  await repo.write('README.md', '');
  await repo.write('src/something.ts', '');
  await repo.write('schema/schema.graphqls', '');
  await repo.write('schema/fragments/a.gql', '');
  const result = await effectValue(scan);
  expect(result.map((file) => file.substr(repo.directory.length))).toEqual([
    '/src/something.ts',
    '/schema/schema.graphqls',
    '/schema/fragments/a.gql',
  ]);
});

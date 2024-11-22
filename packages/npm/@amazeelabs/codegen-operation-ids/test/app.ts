import {
  AnyOperationId,
  OperationResult,
  OperationVariables,
} from '../src/types';
import {
  ListPagesQuery,
  LoadPageQuery,
  LoginMutation,
} from './generated/schema';

declare function graphqlFetch<T extends AnyOperationId>(
  operationId: T,
  variables: OperationVariables<T>,
): Promise<OperationResult<T>>;

async function app() {
  // Input and output of queries is strictly typed.
  const data = await graphqlFetch(LoadPageQuery, { path: '/' });
  console.log(data.loadPage?.title);
  console.log(data.loadPage?.weight);

  await graphqlFetch(LoginMutation, { user: 'admin', pass: 'admin' });

  // Fully optional inputs can be undefined.
  await graphqlFetch(ListPagesQuery, undefined);

  // @ts-expect-error Missing input will throw a type error.
  await graphqlFetch(LoadPageQuery);

  // Invalid input will throw a type error.
  await graphqlFetch(LoadPageQuery, { path: undefined });
}

app().then(console.log).catch(console.error);

import { IPaginationAdapter } from 'gatsby-graphql-source-toolkit';

// Copy of the default LimitOffset pagination adapter with page size
// configurable.
// https://github.com/gatsbyjs/gatsby-graphql-toolkit/blob/7ba8b24d8524254dc6c2853d6d014070befd9aea/src/config/pagination-adapters/limit-offset.ts
export const createLimitOffsetPaginationAdapter = (
  DEFAULT_PAGE_SIZE: number,
): IPaginationAdapter<unknown[], unknown> => ({
  name: 'LimitOffset',
  expectedVariableNames: [`limit`, `offset`],
  start() {
    return {
      variables: { limit: DEFAULT_PAGE_SIZE, offset: 0 },
      hasNextPage: true,
    };
  },
  next(state, page) {
    const limit = state.variables.limit
      ? Number(state.variables.limit)
      : DEFAULT_PAGE_SIZE;
    const offset = Number(state.variables.offset) + limit;
    return {
      variables: { limit, offset },
      hasNextPage: page.length === limit,
    };
  },
  concat(result, page) {
    return result.concat(page);
  },
  getItems(pageOrResult) {
    return pageOrResult;
  },
});

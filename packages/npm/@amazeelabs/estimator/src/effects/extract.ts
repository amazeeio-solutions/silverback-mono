import { FileSystem } from '@effect/platform';
import { gqlPluckFromCodeString } from '@graphql-tools/graphql-tag-pluck';
import { Data, Effect } from 'effect';
import { GraphQLError, parse } from 'graphql';
import type { DocumentNode } from 'graphql/language';

export class ExtractionError extends Data.TaggedError('ExtractionError')<{
  msg: string;
  file: string;
  locations: GraphQLError['locations'];
}> {
  toString(): string {
    return `ExtractionError: "${this.msg}" in "${this.file}${this.locations ? `:${this.locations[0].line}:${this.locations[0].column}` : ''}"`;
  }
}

type BabelParserError = {
  message: string;
  loc: {
    line: number;
    column: number;
  };
};

function isBabelParserError(error: unknown): error is BabelParserError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code.startsWith('BABEL')
  );
}

/**
 * Extract all GraphQL documents from a file.
 * @param file
 * @return DocumentNode[] Parsed GraphQL documents.
 */
export const extract = (file: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const content = (yield* fs.readFile(file)).toString();
    if (file.match(/\.[tjm]sx?$/)) {
      const sources = yield* Effect.tryPromise({
        try: () => gqlPluckFromCodeString(file, content),
        catch: (error) => {
          if (isBabelParserError(error)) {
            return new ExtractionError({
              locations: [error.loc],
              msg: error.message,
              file,
            });
          }
          return new ExtractionError({
            locations: undefined,
            msg: String(error),
            file,
          });
        },
      });
      const documents: DocumentNode[] = [];
      for (const source of sources) {
        try {
          documents.push(parse(source.body));
        } catch (error) {
          if (error instanceof GraphQLError) {
            yield* new ExtractionError({
              locations: error.locations?.map((loc) => ({
                ...loc,
                line: loc.line + source.locationOffset.line - 1,
                column: loc.column + source.locationOffset.column - 1,
              })),
              msg: error.message,
              file,
            });
          }
          yield* new ExtractionError({
            locations: undefined,
            msg: String(error),
            file,
          });
          return [];
        }
      }
      return documents;
    } else {
      try {
        return [parse(content)];
      } catch (error) {
        if (error instanceof GraphQLError) {
          yield* new ExtractionError({
            locations: error.locations,
            msg: error.message,
            file,
          });
        }
        yield* new ExtractionError({
          locations: undefined,
          msg: String(error),
          file,
        });
        return [];
      }
    }
  });

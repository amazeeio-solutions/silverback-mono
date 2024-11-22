import type { SilverbackResolver } from '@amazeelabs/gatsby-source-silverback';

import { resolveResponsiveImage } from './resolvers/responsive_image';

export * from './resolvers/responsive_image';

// TODO: Why not add types?
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const responsiveImage: SilverbackResolver = (source: any, args: any) => {
  return resolveResponsiveImage(source, {
    width: args.width,
    height: args.height,
    sizes: args.sizes,
    transform: args.transform,
  });
};

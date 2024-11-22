import { readFileSync } from 'fs';
import { fluid } from 'gatsby-plugin-sharp';
import {
  createFileNodeFromBuffer,
  createRemoteFileNode,
} from 'gatsby-source-filesystem';

import { SilverbackResolver } from './types';

export const gatsbyNode: SilverbackResolver = async (
  _,
  { type, id }: { type: string; id: string },
  context,
) => {
  return await context.nodeModel.findOne({
    type: type,
    query: {
      filter: {
        id: {
          eq: id,
        },
      },
    },
  });
};

export const gatsbyNodes: SilverbackResolver = async (
  _,
  { type }: { type: string },
  context,
) => {
  return (
    await context.nodeModel.findAll({
      type: type,
    })
  ).entries;
};

export const responsiveImageSharp: SilverbackResolver = async (
  originalImage: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
) => {
  const responsiveImage = JSON.parse(originalImage);
  const { cache, createNode, createNodeId, reporter } = context.api;
  try {
    const responsiveImageResult: {
      originalSrc: string;
      src: string;
      srcset?: string;
      sizes?: string;
      width?: number;
      height?: number;
    } = {
      ...responsiveImage,
      originalSrc: responsiveImage.src,
    };

    // If no config object is given, or no width is specified, we just return
    // the original image url.
    if (typeof args === 'undefined' || typeof args.width === 'undefined') {
      return JSON.stringify(responsiveImageResult);
    }

    const file = responsiveImage.src.startsWith('http')
      ? await createRemoteFileNode({
          url: responsiveImage.src,
          cache: cache,
          createNode: createNode,
          createNodeId: createNodeId,
        })
      : await createFileNodeFromBuffer({
          buffer: readFileSync(responsiveImage.src),
          cache: cache,
          createNode: createNode,
          createNodeId: createNodeId,
        });
    const width = args.width;
    const height = args.height || undefined;
    const breakpoints =
      args.sizes && args.sizes.length > 0
        ? args.sizes.map((item: Array<number> | number) => {
            // If the sizes array contains tuples, then just return the first item
            // to be added to the breakpoints elements.
            if (Array.isArray(item)) {
              return item[0];
            }
            return item;
          })
        : undefined;
    const fluidFileResult = await fluid({
      file,
      args: {
        maxWidth: width,
        maxHeight: height,
        quality: 90,
        srcSetBreakpoints: breakpoints,
        cropFocus: 'entropy',
      },
      reporter: reporter,
      cache: cache,
    });
    responsiveImageResult.src = fluidFileResult.src;
    responsiveImageResult.width = fluidFileResult.presentationWidth;
    responsiveImageResult.height = fluidFileResult.presentationHeight;
    responsiveImageResult.sizes = fluidFileResult.sizes;
    responsiveImageResult.srcset = fluidFileResult.srcSet;

    return JSON.stringify(responsiveImageResult);
  } catch (err) {
    console.error(`Error loading image ${responsiveImage.src}`, err);
    return JSON.stringify(responsiveImage);
  }
};

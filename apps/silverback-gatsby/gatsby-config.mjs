/**
 * Configure your Gatsby site with this file.
 *
 * See: https://www.gatsbyjs.org/docs/gatsby-config/
 */

import { sourceCustomers, sourceEmployees } from '@amazeelabs/test-directives';
import { config as dotenvConfig } from 'dotenv';

import autoloader from './generated/autoloader.mjs';

dotenvConfig({ path: `.env` });

export const siteMetadata = {
  title: 'Gatsby Starter',
  description: 'Gatsby starter for Amazee Labs projects',
  author: '@amazeelabs',
};

export const plugins = [
  'gatsby-plugin-pnpm',
  {
    resolve: 'gatsby-source-filesystem',
    options: {
      name: 'images',
      path: './src/images',
    },
  },
  {
    resolve: '@amazeelabs/gatsby-source-silverback',
    options: {
      drupal_url: process.env.DRUPAL_BASE_URL,
      graphql_path: process.env.DRUPAL_GRAPHQL_PATH,
      auth_key: process.env.DRUPAL_AUTH_KEY,
      schema_configuration: './graphqlrc.yml',
      directives: autoloader,
      sources: { sourceCustomers, sourceEmployees },
    },
  },
  {
    resolve: '@amazeelabs/gatsby-silverback-cloudinary',
    options: {
      // Use a non existent type here so to ensure resolvers are
      // are applied through the @responsiveImage directive.
      responsiveImageResultType: 'IDontExist',
      // responsiveImageFields: [
      //   'DrupalGutenbergPage.anotherResponsiveImage',
      //   'DrupalArticle.responsiveImage',
      // ],
    },
  },
  ...(process.env.SCHEMA_UPDATE === 'true'
    ? ['gatsby-plugin-schema-export']
    : []),
  // Transform Drupal media image fields into local images.
  {
    resolve: `gatsby-plugin-remote-images`,
    options: {
      nodeType: 'DrupalImage',
      imagePath: 'url',
    },
  },

  // Transform images from Drupal WYSIWYG fields into local images.
  {
    resolve: 'gatsby-plugin-images-from-html',
    options: {
      configs: [
        {
          nodeType: 'DrupalPage',
          propertyPath: 'body',
          baseUrl: process.env.DRUPAL_BASE_URL,
        },
        {
          nodeType: 'DrupalArticle',
          propertyPath: 'body',
          baseUrl: process.env.DRUPAL_BASE_URL,
        },
      ],
    },
  },
  {
    resolve: `gatsby-plugin-remote-images`,
    options: {
      nodeType: 'ImagesFromHtml',
      imagePath: 'urlAbsolute',
    },
  },

  'gatsby-transformer-sharp',
  'gatsby-plugin-sharp',
  {
    resolve: 'gatsby-plugin-netlify',
    options: {
      mergeSecurityHeaders: false,
    },
  },
];

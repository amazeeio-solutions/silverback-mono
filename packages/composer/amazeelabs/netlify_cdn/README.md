# Netlify CDN

Integration with Netlify for purging the CDN (assets) cache.

# How it works

When specific actions happen (for now the image style flush hook is implemented)
that could affect resources (for example images) which are stored on netlify,
and they are tagged with specific cache tags, then those cache tags get
invalidated.

As mentioned, this module, out of the box, provides an implementation for the
image style flush hook in netlify_cdn_image_style_flush(), which is also a very
good example on how possibly other custom code could flag specific tags to be
invalidated.

# Configuration

There is no particular configuration form for this module, everything gets
configured through environment variables because the only things needed at the
moment for this module are netlify credentials.

To validate resources on a netlify site, we need two types of credentials: an
auth token and a site id. For the same auth token, we can have also multiple
site ids.

This module is able to purge cache on multiple site ids which can use different
auth tokens a well.

Each individual auth token needs to have an env variable which has the
"**NETLIFY*CDN_AUTH_TOKEN***" prefix, for example:
"**NETLIFY_CDN_AUTH_TOKEN_ANIMALS**". Then, each of the site ids which belong to
the above-mentioned token needs to have the env variable name prefixed with
"**NETLIFY*CDN_SITE_ID_ANIMALS***", for example:
"**NETLIFY_CDN_SITE_ID_ANIMALS_CAT**", "**NETLIFY_CDN_SITE_ID_ANIMALS_DOG**".

As a summary, here is how a possible configuration of env variables would look
like for multiple tokens and multiple sites:

- **NETLIFY_CDN_AUTH_TOKEN_ANIMALS**
  - **NETLIFY_CDN_SITE_ID_ANIMALS_CAT**
  - **NETLIFY_CDN_SITE_ID_ANIMALS_DOG**
- **NETLIFY_CDN_AUTH_TOKEN_TREES**
  - **NETLIFY_CDN_SITE_ID_TREES_OAK**
  - **NETLIFY_CDN_SITE_ID_TREES_PINE**

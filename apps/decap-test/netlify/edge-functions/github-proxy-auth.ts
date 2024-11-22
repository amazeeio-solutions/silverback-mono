import type { Context } from '@netlify/edge-functions';

// For some reason pnpm package imports break in edge handlers.
import {
  JwtEncoder,
  PostmarkEmailBackend,
  TokenAuthHandler,
} from '../../node_modules/@amazeelabs/token-auth-middleware/build/index.js';

export default async (request: Request, context: Context) => {
  if (
    !(Netlify.env.has('JWT_SECRET') && Netlify.env.has('POSTMARK_API_TOKEN'))
  ) {
    throw new Error(
      'Missing environment variables JWT_SECRET and POSTMARK_API_TOKEN.',
    );
  }

  const encoder = new JwtEncoder(Netlify.env.get('JWT_SECRET') as string);
  const backend = new PostmarkEmailBackend(
    {
      // Grant access to everybody @amazeelabs.com.
      '*@amazeelabs.com': '*',
    },
    'noreply@amazeelabs.com',
    Netlify.env.get('POSTMARK_API_TOKEN') as string,
    'login-link',
  );

  const handler = new TokenAuthHandler(
    '/.netlify/functions/github-proxy',
    encoder,
    backend,
    {
      tokenLifetime: 300,
    },
  );
  return handler.handle(request, context.next);
};

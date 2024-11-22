import loginPage from '../assets/login.html?raw';
import notificationPage from '../assets/notification.html?raw';
import pageStyles from '../assets/styles.css?raw';

function injectStyles(html: string, styles: string) {
  return html.replace(
    '<link rel="stylesheet" href="styles.css" />',
    `<style>${styles}</style>`,
  );
}

export type TokenAuthHandlerOptions = {
  /**
   * Custom login page to redirect to.
   */
  customLogin?: string;

  /**
   * Lifetime of the login token in seconds.
   * Defaults to five minute.
   */
  tokenLifetime?: number;

  /**
   * Lifetime of the session in seconds.
   * Defaults to no expiration.
   */
  sessionLifetime?: number;
};

export class TokenExpiredError extends Error {
  constructor() {
    super('Token expired');
  }
}

export class TokenInvalidError extends Error {
  constructor() {
    super('Token invalid');
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Info = Record<string, any>;

export interface TokenEncoderInterface {
  create(id: string, lifetime?: number): Promise<string>;

  /**
   * @throws TokenExpiredError
   * @throws TokenInvalidError
   * @param token
   */
  validate(token: string): Promise<string>;
}

export interface AuthenticationBackendInterface<TInfo extends Info> {
  getInfo(id: string): Promise<TInfo | undefined>;
  deliver(id: string, link: string): Promise<void>;
}

export function metaRedirect(message: string, destination: string) {
  return `<html lang="en"><head><title>${message.replace(
    /(<([^>]+)>)/gi,
    '',
  )}</title><meta http-equiv="refresh" content="0;url=${destination}" /></head></html>`;
}

export function cookieHeader(token: string, path: string) {
  return `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=${path}`;
}

export class TokenAuthHandler {
  protected options: TokenAuthHandlerOptions;
  constructor(
    protected basePath: string,
    protected encoder: TokenEncoderInterface,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected backend: AuthenticationBackendInterface<any>,
    options: TokenAuthHandlerOptions = {},
  ) {
    this.options = {
      tokenLifetime: 300,
      sessionLifetime: 0,
      ...options,
    };
  }

  async handle(req: Request, next: () => Promise<Response>) {
    const path = new URL(req.url).pathname;

    if (path.endsWith('___login')) {
      if (req.method === 'GET') {
        return new Response(injectStyles(loginPage, pageStyles), {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store',
          },
        });
      } else if (
        req.method === 'POST' &&
        req.headers
          .get('Content-Type')
          ?.includes('application/x-www-form-urlencoded')
      ) {
        const id = new URLSearchParams(await req.text()).get('id');
        if (!id) {
          return new Response('Invalid request.', {
            status: 405,
            headers: {
              'Cache-Control': 'no-store',
            },
          });
        }
        const info = await this.backend.getInfo(id);
        if (info) {
          const url = new URL(req.url);
          const referrer = req.headers.get('Referer');
          if (!url.searchParams.has('destination')) {
            const destination = referrer
              ? new URL(referrer).searchParams.get('destination')
              : null;
            if (destination) {
              url.searchParams.append('destination', destination);
            }
          }
          const token = await this.encoder.create(
            id,
            this.options.tokenLifetime,
          );

          url.searchParams.append('token', token);
          url.pathname = url.pathname.replace('___login', '___auth');
          const link = url.toString();
          await this.backend.deliver(id, link);
        }
        // We don't want anybody to try email addresses, so we show the
        // notification every time, regardless of the result.
        return new Response(injectStyles(notificationPage, pageStyles), {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store',
          },
        });
      } else {
        return new Response('Invalid request.', {
          status: 405,
          headers: {
            'Cache-Control': 'public',
          },
        });
      }
    }

    if (path.endsWith('___auth')) {
      const token = new URL(req.url).searchParams.get('token');
      if (token) {
        try {
          const id = await this.encoder.validate(token);
          if (id) {
            const info = await this.backend.getInfo(id);
            if (info) {
              const url = new URL(req.url);
              const rawDestination = url.searchParams.get('destination') || '/';
              let destination = null;
              try {
                // Make sure destination is a proper url within the restricted
                // path.
                const destinationUrl = new URL(rawDestination);
                if (destinationUrl.hostname === url.hostname) {
                  destination = rawDestination;
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
              } catch (e) {
                // Ignore, just don't set a destination.
              }
              const sessionToken = await this.encoder.create(
                id,
                this.options.sessionLifetime,
              );
              return new Response(
                metaRedirect('Login successful', destination || this.basePath),
                {
                  status: 200,
                  headers: {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-store',
                    'Set-Cookie': cookieHeader(sessionToken, this.basePath),
                  },
                },
              );
            }
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          return new Response('', {
            status: 401,
            headers: {
              'Cache-Control': 'no-store',
            },
          });
        }
      }
      return new Response('', {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }

    if (path.endsWith('___logout')) {
      if (req.method !== 'POST') {
        return new Response('Has to be a POST request.', {
          status: 405,
          headers: {
            'Cache-Control': 'public',
          },
        });
      }

      const destination = this.options.customLogin
        ? this.options.customLogin
        : this.basePath + '/___login';

      return new Response(metaRedirect('Logged out', destination), {
        status: 200,
        headers: {
          'Set-Cookie': cookieHeader('', this.basePath),
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store',
        },
      });
    }

    const sessionToken = parseCookies(req);
    if (sessionToken) {
      try {
        const payload = await this.encoder.validate(sessionToken);
        if (payload) {
          const info = await this.backend.getInfo(payload);
          if (info) {
            if (path.endsWith('___status')) {
              return new Response(
                JSON.stringify({ ...info, token: sessionToken }),
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                  },
                  status: 200,
                },
              );
            }

            const response = await next();
            response.headers.set('Cache-Control', 'no-store');
            return response;
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // Do nothing, just treat it as if there was no cookie.
      }
    }

    // If the request expects HTML, redirect unauthenticated to login.
    if (req.headers.get('Accept')?.includes('text/html')) {
      const url = new URL(req.url.split('?')[0]);
      if (this.options.customLogin) {
        url.pathname = this.options.customLogin;
      } else {
        url.pathname = this.basePath + '/___login';
      }
      url.searchParams.append('destination', req.url);
      return Response.redirect(url.toString(), 302);
    }

    return new Response('Not authenticated', {
      status: 401,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}

function parseCookies(request: Request) {
  const cookies = request.headers.get('Cookie');
  if (cookies) {
    const session = cookies
      .split(';')
      .find((c) => c.trim().startsWith('session='));
    if (session) {
      return session.split('=')[1];
    }
  }
  return false;
}

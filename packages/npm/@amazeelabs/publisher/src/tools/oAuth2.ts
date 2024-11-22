import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import fetch from 'node-fetch';
import {
  AccessToken,
  AuthorizationCode,
  ModuleOptions,
  ResourceOwnerPassword,
} from 'simple-oauth2';

import { getConfig } from './config';

declare module 'express-session' {
  interface SessionData {
    tokenString: string;
    state: string;
  }
}

// In seconds
export const SESSION_MAX_AGE = 60 * 60 * 12;

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Returns the Authorization Code middleware.
 *
 * This should be favoured in most cases when using OAuth2.
 */
export const oAuth2AuthCodeMiddleware: RequestHandler = ((): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Don't trigger authentication for the build process.
    if (req.path === '/build.json') {
      return next();
    }
    if (await isAuthenticated(req)) {
      const accessPublisher = await hasPublisherAccess(req);
      if (accessPublisher) {
        return next();
      } else {
        res
          .status(403)
          .send(
            'Your user account does not have Publisher access. You might contact your site administrator.',
          );
      }
    } else {
      res.cookie('origin', req.originalUrl).redirect('/oauth');
    }
  };
})();

/**
 * Returns the Resource Owner Password middleware.
 *
 * This can be used as a minimal implementation of OAuth2 if the challenge
 * is to be exposed in the client / the backend is only accessible
 * from the client and not the end user.
 *
 * Refresh tokens are not implemented.
 */
export const oAuth2ResourceOwnerPasswordMiddleware: RequestHandler =
  ((): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const oAuth2Config = getConfig().oAuth2;
      if (!oAuth2Config) {
        throw new Error('OAuth2 configuration is missing.');
      }

      // As an MVP, we are using the www-authenticate header to send the challenge.
      // This allows to have a lightweight implementation of the UI, and we
      // don't need to handle any session.
      const base64Auth = (req.headers.authorization || '').split(' ')[1] || '';
      const [wwwLogin, wwwPassword] = Buffer.from(base64Auth, 'base64')
        .toString()
        .split(':');

      const oAuth2ModuleOptions: ModuleOptions = {
        client: {
          id: oAuth2Config.clientId,
          secret: oAuth2Config.clientSecret,
        },
        auth: {
          tokenHost: oAuth2Config.tokenHost,
          tokenPath: oAuth2Config.tokenPath,
        },
      };
      const oAuth2Client = new ResourceOwnerPassword(oAuth2ModuleOptions);
      let errorMessage: string | null = null;

      if (wwwLogin && wwwPassword) {
        const tokenParams = {
          username: wwwLogin,
          password: wwwPassword,
          scope: oAuth2Config.scope,
        };

        try {
          const accessToken = await oAuth2Client.getToken(tokenParams);
          if (accessToken) {
            const publisherAuthentication = await fetch(
              `${oAuth2ModuleOptions.auth.tokenHost}/publisher/access`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken.token.access_token}`,
                },
              },
            );

            if (publisherAuthentication.status === 200) {
              return next();
            } else if (
              publisherAuthentication.status === 403 ||
              publisherAuthentication.status === 401
            ) {
              errorMessage = 'Publisher authentication failed.';
            } else if (publisherAuthentication.status === 500) {
              errorMessage = 'Internal server error.';
            } else {
              errorMessage = 'Unknown error.';
            }
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          errorMessage = 'OAuth2 authentication failed.';
        }
      }

      // In case of failure, just send a 401 with the www-authenticate header.
      res.set('WWW-Authenticate', 'Basic realm="401"');
      if (errorMessage) {
        console.error(errorMessage);
        res.status(401).send(errorMessage);
      } else {
        res.status(401).send('Authentication required.');
      }
    };
  })();

export const initializeSession = (server: Express): void => {
  const oAuth2Config = getConfig().oAuth2;
  if (!oAuth2Config) {
    throw new Error('Missing OAuth2 configuration.');
  }
  server.use(cookieParser());

  const sessionMaxAgeInMilliseconds = SESSION_MAX_AGE * 1000;
  const MemoryStore = createMemoryStore(session);

  const config: Parameters<typeof session>[0] = {
    secret:
      oAuth2Config.sessionSecret || crypto.randomBytes(64).toString('hex'),
    resave: true, // seems to be needed for MemoryStore
    saveUninitialized: false,
    cookie: { maxAge: sessionMaxAgeInMilliseconds },
    // Keep it simple, use production safe memory store,
    // not the one provided by express-session.
    // Other available stores
    // https://expressjs.com/en/resources/middleware/session.html#compatible-session-stores
    store: new MemoryStore({
      checkPeriod: sessionMaxAgeInMilliseconds, // prune expired entries
    }),
  };

  if (oAuth2Config.environmentType === 'production') {
    server.set('trust proxy', 1); // trust first proxy
    config.cookie!.secure = true; // serve secure cookies
  }

  server.use(session(config));
};

export const oAuth2AuthorizationCodeClient = (): AuthorizationCode | null => {
  const oAuth2Config = getConfig().oAuth2;
  if (!oAuth2Config) {
    return null;
  }
  return new AuthorizationCode({
    client: {
      id: oAuth2Config.clientId,
      secret: oAuth2Config.clientSecret,
    },
    auth: {
      tokenHost: oAuth2Config.tokenHost,
      tokenPath: oAuth2Config.tokenPath,
      authorizePath: oAuth2Config.authorizePath,
    },
  });
};

export const persistAccessToken = (token: AccessToken, req: Request): void => {
  req.session.tokenString = encrypt(JSON.stringify(token));
};

export const getPersistedAccessToken = (req: Request): AccessToken | null => {
  const client = oAuth2AuthorizationCodeClient();
  if (!client) {
    throw new Error('Missing OAuth2 client.');
  }
  if (req.session.tokenString) {
    const decryptedToken = decrypt(req.session.tokenString);
    if (!decryptedToken) {
      throw new Error('Failed to decrypt token.');
    }
    return client.createToken(JSON.parse(decryptedToken));
  } else {
    return null;
  }
};

const encrypt = (text: string): string => {
  if (!ENCRYPTION_KEY) {
    throw new Error('Missing encryption key.');
  }

  const oAuth2Config = getConfig().oAuth2;
  if (!oAuth2Config) {
    throw new Error('Missing OAuth2 configuration.');
  }

  try {
    const iv = crypto.randomBytes(16);
    const key = crypto
      .createHash('sha256')
      .update(ENCRYPTION_KEY)
      .digest('base64')
      .substring(0, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    throw new Error('Encryption failed.');
  }
};

const decrypt = (encryptedText: string): string => {
  if (!ENCRYPTION_KEY) {
    throw new Error('Missing encryption key.');
  }

  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');

    const encryptedData = Buffer.from(textParts.join(':'), 'hex');
    const key = crypto
      .createHash('sha256')
      .update(ENCRYPTION_KEY)
      .digest('base64')
      .substring(0, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    const decrypted = decipher.update(encryptedData);
    const decryptedText = Buffer.concat([decrypted, decipher.final()]);
    return decryptedText.toString();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    throw new Error('Decryption failed.');
  }
};

export const getOAuth2AuthorizeUrl = (
  client: AuthorizationCode,
  req: Request,
): string => {
  const oAuth2Config = getConfig().oAuth2;
  if (!oAuth2Config) {
    throw new Error('Missing OAuth2 configuration.');
  }

  const state = crypto.randomBytes(32).toString('hex');
  persistState(state, req);
  const encodedState = Buffer.from(state).toString('base64');
  return client.authorizeURL({
    // Set on the OAuth2 provider.
    //redirect_uri: callbackUrl,
    // https://auth0.com/docs/secure/attack-protection/state-parameters
    state: encodedState,
  });
};

export const persistState = (state: string, req: Request): void => {
  req.session.state = state;
};

export const stateMatches = (req: Request): boolean => {
  const persistedState = req.session.state;
  if (persistedState === undefined) {
    return false;
  }
  const encodedState = req.query.state as string;
  if (encodedState === undefined) {
    return false;
  }
  const decodedState = Buffer.from(encodedState, 'base64').toString('ascii');
  return persistedState === decodedState;
};

export const isAuthenticated = async (req: Request): Promise<boolean> => {
  const oAuth2Config = getConfig().oAuth2;
  if (!oAuth2Config) {
    throw new Error('Missing OAuth2 configuration.');
  }

  let result = false;
  let accessToken = getPersistedAccessToken(req);
  if (accessToken) {
    if (!accessToken.expired()) {
      result = true;
    } else {
      try {
        accessToken = await accessToken.refresh();
        persistAccessToken(accessToken, req);
        result = true;
      } catch (error) {
        console.error('Error refreshing access token: ', error);
      }
    }
  } else {
    console.log('No access token.');
  }

  return result;
};

export const hasPublisherAccess = async (req: Request): Promise<boolean> => {
  const oAuth2Config = getConfig().oAuth2;
  if (!oAuth2Config) {
    throw new Error('Missing OAuth2 configuration.');
  }

  const accessToken = getPersistedAccessToken(req);
  if (!accessToken) {
    throw new Error('Missing access token.');
  }

  const publisherAccess = await fetch(
    `${oAuth2Config.tokenHost}/publisher/access`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.token.access_token}`,
      },
    },
  );

  const status = await publisherAccess.status;
  return status === 200;
};

/**
 * User info.
 *
 * Can be used for debugging purposes.
 */
export const getUserInfo = async (req: Request): Promise<boolean> => {
  const accessToken = getPersistedAccessToken(req);
  if (!accessToken) {
    throw new Error('Missing access token.');
  }
  try {
    const userInfoResponse = await fetch(
      'http://127.0.0.1:8888/oauth/userinfo',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.token.access_token}`,
        },
      },
    );
    const status = await userInfoResponse.status;
    console.debug('User info status', status);
    if (status === 200) {
      const json = await userInfoResponse.json();
      console.debug('User info', json);
    }
    return status === 200;
  } catch (error) {
    console.error('Error fetching user info', error);
  }

  return false;
};

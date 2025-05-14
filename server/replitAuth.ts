import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Always get the Replit domain 
const replitDomain = process.env.REPLIT_DOMAINS || '';
console.log(`Current Replit domain: ${replitDomain}`);

// For development mode, handle both Replit and local domains
if (process.env.NODE_ENV === 'development') {
  // Add both Replit domain and local domains
  process.env.REPLIT_DOMAINS = replitDomain;
  
  if (replitDomain) {
    // If we have a Replit domain, also add the local domains
    process.env.REPLIT_DOMAINS = `${replitDomain},127.0.0.1,localhost`;
  } else {
    // If no Replit domain, just use local domains
    process.env.REPLIT_DOMAINS = '127.0.0.1,localhost';
  }
  
  console.log(`Development mode: Using domains for auth: ${process.env.REPLIT_DOMAINS}`);
}

// Set default values for development
if (process.env.NODE_ENV === 'development') {
  if (!process.env.REPL_ID) {
    process.env.REPL_ID = 'dev-repl-id';
    console.log('Development mode: Using placeholder REPL_ID');
  }
  
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'dev-session-secret-2j3h4j23h4';
    console.log('Development mode: Using placeholder SESSION_SECRET');
  }
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Determine if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  // For development mode, add a special strategy for localhost/127.0.0.1
  if (isDev) {
    // First, add the actual Replit domain strategy (if available)
    if (replitDomain && !replitDomain.includes('localhost') && !replitDomain.includes('127.0.0.1')) {
      const replit_callback = `https://${replitDomain}/api/callback`;
      console.log(`Setting up auth strategy for Replit domain: ${replitDomain} with callback: ${replit_callback}`);
      
      const replitStrategy = new Strategy(
        {
          name: `replitauth:${replitDomain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: replit_callback,
        },
        verify,
      );
      passport.use(replitStrategy);
    }
    
    // Always add strategies for localhost and 127.0.0.1 in development
    const localDomains = ['127.0.0.1', 'localhost'];
    
    for (const domain of localDomains) {
      const localCallbackUrl = `http://${domain}:5000/api/callback`;
      console.log(`Setting up auth strategy for local domain: ${domain} with callback: ${localCallbackUrl}`);
      
      const localStrategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: localCallbackUrl,
        },
        verify,
      );
      passport.use(localStrategy);
    }
  } else {
    // In production, just use the Replit domain
    const callbackURL = `https://${replitDomain}/api/callback`;
    console.log(`Setting up auth strategy for domain: ${replitDomain} with callback: ${callbackURL}`);
    
    const strategy = new Strategy(
      {
        name: `replitauth:${replitDomain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const hostname = req.hostname || '127.0.0.1';
    console.log(`Login request from hostname: ${hostname}`);
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('127.0.0.1')) {
      // For local development, always use 127.0.0.1
      passport.authenticate('replitauth:127.0.0.1', {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } else {
      // For Replit environment, use the actual hostname
      passport.authenticate(`replitauth:${hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    }
  });

  app.get("/api/callback", (req, res, next) => {
    const hostname = req.hostname || '127.0.0.1';
    console.log(`Callback request from hostname: ${hostname}`);
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('127.0.0.1')) {
      // For local development, always use 127.0.0.1
      passport.authenticate('replitauth:127.0.0.1', {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    } else {
      // For Replit environment, use the actual hostname
      passport.authenticate(`replitauth:${hostname}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.redirect("/api/login");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.redirect("/api/login");
  }
};
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    // Extend the User interface
    interface User {
      id: string;
      email: string | null;
      username: string | null;
      password?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
      createdAt?: Date | null;
      updatedAt?: Date | null;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Configure session middleware with improved settings for development
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "wickedfiles-s3-browser-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Using false for non-HTTPS development environment
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      sameSite: 'lax'
    },
  };
  
  console.log("Session configured with cookie settings:", sessionSettings.cookie);

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure Google OAuth Strategy
  const googleCallbackURL = process.env.NODE_ENV === "production" 
    ? "https://yourdomain.com/api/auth/google/callback" 
    : "http://localhost:5000/api/auth/google/callback";
    
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: googleCallbackURL,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // First check if user exists with Google ID
          const googleId = `google_${profile.id}`;
          let user = await storage.getUser(googleId);
          
          // If not found by ID, check by email
          if (!user && profile.emails && profile.emails.length > 0) {
            user = await storage.getUserByEmail(profile.emails[0].value);
          }
          
          if (!user) {
            // Create a new user with Google profile data
            const username = profile.displayName || 
                            (profile.emails && profile.emails.length > 0 ? 
                             profile.emails[0].value.split('@')[0] : 
                             `user_${Math.floor(Math.random() * 10000)}`);
            
            user = await storage.createUser({
              // Use Google ID as user ID with a prefix to indicate the source
              id: googleId,
              email: profile.emails?.[0]?.value || null,
              username: username,
              firstName: profile.name?.givenName || null,
              lastName: profile.name?.familyName || null,
              profileImageUrl: profile.photos?.[0]?.value || null,
              // No password needed for OAuth users
              password: null
            });
            
            console.log("Created new user from Google OAuth:", user);
          } else {
            // Update existing user with latest Google profile data
            user = await storage.upsertUser({
              id: user.id,
              email: profile.emails?.[0]?.value || null,
              firstName: profile.name?.givenName || user.firstName,
              lastName: profile.name?.familyName || user.lastName,
              profileImageUrl: profile.photos?.[0]?.value || user.profileImageUrl,
            });
            
            console.log("Updated existing user from Google OAuth:", user);
          }
          
          return done(null, user);
        } catch (error) {
          console.error("Google auth error:", error);
          return done(error as Error);
        }
      }
    )
  );

  // Local authentication strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          console.log(`Auth attempt with email: ${email}`);
          
          // Test user for debugging 
          if (email === "test@wickedfiles.com" && password === "password123") {
            console.log("Using test user account");
            const testUser = await storage.getUserByEmail("test@wickedfiles.com");
            if (testUser) {
              console.log("Found test user:", testUser.id);
              return done(null, testUser);
            }
          }
          
          const user = await storage.getUserByEmail(email);
          if (!user) {
            console.log(`User not found with email: ${email}`);
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValid = await comparePasswords(password, user.password || "");
          if (!isValid) {
            console.log(`Invalid password for user: ${email}`);
            return done(null, false, { message: "Invalid email or password" });
          }

          console.log(`User authenticated successfully: ${user.id}`);
          return done(null, user);
        } catch (error) {
          console.error("Authentication error:", error);
          return done(error);
        }
      }
    )
  );

  // Serialize/deserialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Auth endpoints
  app.post("/api/register", async (req, res) => {
    try {
      const { username, email, password, confirmPassword } = req.body;

      // Validate input
      if (!username || !email || !password) {
        return res.status(400).json({
          message: "Username, email, and password are required",
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          message: "Passwords do not match",
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: "Email already in use",
        });
      }

      // Create new user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        // ID will be auto-generated by storage.createUser
        username,
        email,
        password: hashedPassword,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
      });

      // Log in the user
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({
            message: "Error during login after registration",
          });
        }
        return res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        message: "Error creating user",
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt:", req.body.email);
    
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error("Auth error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Authentication failed:", info?.message);
        return res.status(401).json({
          message: info?.message || "Authentication failed",
        });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          message: "Error during logout",
        });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }
    res.json(req.user);
  });

  // Google OAuth routes
  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      successRedirect: "/",
      failureRedirect: "/auth",
    })
  );

  // Middleware for protected routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`Request: ${req.method} ${req.path}, Authenticated: ${req.isAuthenticated()}`);
    next();
  });
}

// Middleware for routes that require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({
    message: "Authentication required",
  });
}
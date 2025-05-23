import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import { Express } from "express";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const scryptAsync = promisify(scrypt);

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        firstName?: string;
        lastName?: string;
        profileImageUrl?: string;
        isAdmin?: boolean;
        isActive?: boolean;
        createdAt: Date;
        updatedAt?: Date;
      };
    }
  }
}

// Password hashing
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    // Check if password is in the correct format (has a salt component)
    if (!stored || !stored.includes('.')) {
      console.error('Password format invalid: missing salt component');
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    if (!salt) {
      console.error('Password salt is undefined or empty');
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

// Authentication middleware
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    // Fetch the user and attach to the request
    storage.getUser(req.session.userId)
      .then(user => {
        if (user) {
          // Convert null values to undefined to match the type expected by req.user
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName ?? undefined,
            lastName: user.lastName ?? undefined,
            profileImageUrl: user.profileImageUrl ?? undefined,
            isAdmin: user.isAdmin === true,
            isActive: user.isActive === true,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt ?? undefined
          };
          next();
        } else {
          res.status(401).json({ message: "User not found" });
        }
      })
      .catch(err => {
        console.error("Error fetching user in auth middleware:", err);
        res.status(500).json({ message: "Server error" });
      });
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}

// Session setup
export function setupSession(app: Express) {
  const PgSession = connectPg(session);
  const sessionStore = new PgSession({
    pool,
    tableName: "sessions",
    createTableIfMissing: true,
  });

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );
}

// Authentication routes setup
export function setupAuthRoutes(app: Express) {
  // Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user with generated ID
      const userId = 'local_' + randomBytes(8).toString('hex');
      const user = await storage.createUser({
        id: userId,
        username,
        email,
        password: hashedPassword,
      });
      
      // Set session
      if (req.session) {
        req.session.userId = user.id;
      }
      
      // Return user (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Error creating user" });
    }
  });
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check password
      const passwordValid = await comparePasswords(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Set session
      if (req.session) {
        req.session.userId = user.id;
      }
      
      // Return user (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Error logging in" });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Error logging out" });
        }
        res.clearCookie("connect.sid");
        res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      res.status(200).json({ message: "Already logged out" });
    }
  });
  
  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(200).json(null);
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(200).json(null);
      }
      
      // Return user (without password)
      const { password: _, ...userWithoutPassword } = user;
      // Ensure boolean values are correctly converted
      const userWithCorrectBooleans = {
        ...userWithoutPassword,
        isAdmin: user.isAdmin === true,
        isActive: user.isActive === true
      };
      res.status(200).json(userWithCorrectBooleans);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Error getting user" });
    }
  });
}
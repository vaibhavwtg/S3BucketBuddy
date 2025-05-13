import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertS3AccountSchema, insertSharedFileSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import MemoryStore from "memorystore";
import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import { Readable } from "stream";

// Helper function to convert null to undefined
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

// Define types for authenticated requests
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      avatarUrl?: string;
    }
    
    // Add multer file to Request type
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const MemoryStoreSession = MemoryStore(session);
  
  // Configure session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "super-secret-key",
      resave: false,
      saveUninitialized: true, // Changed to true to ensure session is always created
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'lax', // Helps with CSRF protection while allowing redirects
        path: '/', // Ensure cookie is available throughout the application
      },
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure Local Strategy for authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          if (!user || !user.password) {
            return done(null, false, { message: "Incorrect email or password" });
          }
          
          const isValid = await bcrypt.compare(password, user.password);
          
          if (!isValid) {
            return done(null, false, { message: "Incorrect email or password" });
          }
          
          return done(null, {
            id: user.id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl || undefined,
          });
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  
  // Serialize and Deserialize User
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user with ID: ${id}`);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.error(`User with ID ${id} not found during deserialization`);
        return done(new Error("User not found"));
      }
      
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl || undefined,
      };
      
      console.log(`Successfully deserialized user: ${user.username} (${user.id})`);
      done(null, userData);
    } catch (error) {
      console.error("Error during user deserialization:", error);
      done(error);
    }
  });
  
  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: any) => {
    console.log("Authentication check for route:", req.method, req.url);
    console.log("Authenticated:", req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      console.log("Authentication failed");
      return res.status(401).json({ message: "Unauthorized" });
    }
    console.log("Authentication successful, user:", req.user ? req.user.id : 'none');
    next();
  };
  
  // Configure multer for file uploads
  const upload = multer({ storage: multer.memoryStorage() });
  
  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userSchema = insertUserSchema.extend({
        confirmPassword: z.string(),
      });
      
      const validatedData = userSchema.parse(req.body);
      
      // Check if passwords match
      if (validatedData.password !== validatedData.confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }
      
      // Check if email is already taken
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // If username is not provided, use email as username
      if (!validatedData.username) {
        validatedData.username = validatedData.email.split('@')[0];
      }
      
      // Ensure username is unique by adding a suffix if needed
      let finalUsername = validatedData.username;
      let counter = 1;
      
      while (await storage.getUserByUsername(finalUsername)) {
        finalUsername = `${validatedData.username}${counter}`;
        counter++;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...validatedData,
        username: finalUsername,
        password: hashedPassword,
        authProvider: "email",
      });
      
      // Create default user settings
      await storage.createOrUpdateUserSettings({
        userId: user.id,
        theme: "light",
        notifications: true,
      });
      
      // Authenticate the user
      req.login(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl || undefined,
        },
        (err) => {
          if (err) {
            return res.status(500).json({ message: "Authentication failed" });
          }
          return res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
          });
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
  
  app.post("/api/auth/login", (req, res, next) => {
    console.log("Login attempt:", req.body.email);
    
    passport.authenticate("local", (err: any, user: any, info: { message?: string }) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Login failed", error: err.message });
      }
      
      if (!user) {
        console.log("Login failed:", info?.message || "Invalid credentials");
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session creation error:", loginErr);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        console.log("Login successful for user:", user.username, `(${user.id})`);
        console.log("Session established:", req.session.id);
        
        // Set a response header for debugging
        res.setHeader('X-Session-ID', req.session.id);
        
        return res.json(user);
      });
    })(req, res, next);
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
  
  // S3 Account Routes
  app.get("/api/s3-accounts", requireAuth, async (req, res) => {
    try {
      const accounts = await storage.getS3Accounts(req.user!.id);
      
      // Don't send back the secret access key
      const sanitizedAccounts = accounts.map((account) => ({
        ...account,
        secretAccessKey: "••••••••••••••••",
      }));
      
      res.json(sanitizedAccounts);
    } catch (error) {
      console.error("Error fetching S3 accounts:", error);
      res.status(500).json({ message: "Failed to retrieve S3 accounts" });
    }
  });
  
  app.post("/api/s3-accounts", requireAuth, async (req, res) => {
    try {
      console.log("Creating S3 account, request body:", JSON.stringify(req.body));
      
      // Filter out fields that are not in our DB schema
      const { saveCredentials, selectedBucket, ...accountData } = req.body;
      
      // Prepare account data with user ID and defaultBucket if provided
      const accountInput = {
        ...accountData,
        userId: req.user!.id,
        defaultBucket: selectedBucket || null
      };
      
      // Validate the account data
      try {
        console.log("Validating S3 account data:", JSON.stringify(accountInput));
        insertS3AccountSchema.parse(accountInput);
      } catch (validationError) {
        console.error("Validation error details:", validationError);
        return res.status(400).json({ message: "Invalid account data", details: validationError instanceof z.ZodError ? validationError.errors : "Unknown validation error" });
      }
      
      // Validate S3 credentials and auto-detect region if not provided
      try {
        // If region is not specified or set to "auto", try to detect it
        if (!accountInput.region || accountInput.region === "auto") {
          console.log("Attempting to auto-detect S3 region");
          // Try with us-east-1 first (default region)
          const defaultClient = new S3Client({
            region: "us-east-1",
            credentials: {
              accessKeyId: accountInput.accessKeyId,
              secretAccessKey: accountInput.secretAccessKey,
            },
          });
          
          try {
            // Try to get bucket location constraint to determine appropriate region
            const { Buckets } = await defaultClient.send(new ListBucketsCommand({}));
            console.log(`Found ${Buckets?.length || 0} buckets, using region us-east-1`);
            // If successful, set the region to us-east-1
            accountInput.region = "us-east-1";
          } catch (error) {
            // If the error suggests a different region, use that
            console.log("Initial region detection failed, using fallback:", error);
            accountInput.region = "us-east-1"; // Fallback to default if detection fails
          }
        }
        
        // Create an S3 client with the detected or provided region
        const s3Client = new S3Client({
          region: accountInput.region,
          credentials: {
            accessKeyId: accountInput.accessKeyId,
            secretAccessKey: accountInput.secretAccessKey,
          },
        });
        
        // Test the credentials by listing buckets with the correct region
        await s3Client.send(new ListBucketsCommand({}));
      } catch (s3Error) {
        console.error("S3 validation error:", s3Error);
        return res.status(400).json({ message: "Invalid S3 credentials" });
      }
      
      // Create the account in the database
      const account = await storage.createS3Account(accountInput);
      
      // Optionally set as default account if it's the first one
      const accounts = await storage.getS3Accounts(req.user!.id);
      if (accounts.length === 1) {
        const settings = await storage.getUserSettings(req.user!.id);
        if (settings) {
          await storage.createOrUpdateUserSettings({
            ...settings,
            defaultAccountId: account.id,
          });
        } else {
          await storage.createOrUpdateUserSettings({
            userId: req.user!.id,
            defaultAccountId: account.id,
          });
        }
      }
      
      // Don't send back the secret access key
      res.status(201).json({
        ...account,
        secretAccessKey: "••••••••••••••••",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating S3 account:", error);
      res.status(500).json({ message: "Failed to create S3 account" });
    }
  });
  
  app.put("/api/s3-accounts/:id", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      
      // Check if account belongs to user
      const account = await storage.getS3Account(accountId);
      if (!account || account.userId !== req.user!.id) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const updates = req.body;
      
      // If updating credentials, validate them
      if (updates.accessKeyId && updates.secretAccessKey && updates.region) {
        try {
          const s3Client = new S3Client({
            region: updates.region,
            credentials: {
              accessKeyId: updates.accessKeyId,
              secretAccessKey: updates.secretAccessKey,
            },
          });
          
          // Test the credentials by listing buckets
          await s3Client.send(new ListBucketsCommand({}));
        } catch (s3Error) {
          console.error("S3 validation error:", s3Error);
          return res.status(400).json({ message: "Invalid S3 credentials" });
        }
      }
      
      const updatedAccount = await storage.updateS3Account(accountId, updates);
      
      // Don't send back the secret access key
      res.json({
        ...updatedAccount,
        secretAccessKey: "••••••••••••••••",
      });
    } catch (error) {
      console.error("Error updating S3 account:", error);
      res.status(500).json({ message: "Failed to update S3 account" });
    }
  });
  
  app.delete("/api/s3-accounts/:id", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.id);
      
      // Check if account belongs to user
      const account = await storage.getS3Account(accountId);
      if (!account || account.userId !== req.user!.id) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // First, update user settings if this was the default account
      // This must be done BEFORE deleting to avoid constraint violations
      const settings = await storage.getUserSettings(req.user!.id);
      if (settings && settings.defaultAccountId === accountId) {
        // Find another account to set as default, or set to null
        const accounts = await storage.getS3Accounts(req.user!.id);
        const otherAccounts = accounts.filter(a => a.id !== accountId);
        const defaultAccountId = otherAccounts.length > 0 ? otherAccounts[0].id : null;
        
        console.log(`Updating default account from ${accountId} to ${defaultAccountId}`);
        
        await storage.createOrUpdateUserSettings({
          ...settings,
          defaultAccountId: defaultAccountId,
        });
      }
      
      // Now safe to delete the account
      const deleted = await storage.deleteS3Account(accountId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete S3 account" });
      }
      
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting S3 account:", error);
      res.status(500).json({ message: "Failed to delete S3 account" });
    }
  });
  
  // Validate S3 credentials
  app.post("/api/validate-s3-credentials", requireAuth, async (req, res) => {
    try {
      const { accessKeyId, secretAccessKey, region } = req.body;
      
      if (!accessKeyId || !secretAccessKey) {
        return res.status(400).json({ 
          valid: false,
          error: "Access key ID and secret access key are required" 
        });
      }
      
      // Create S3 client
      const client = new S3Client({
        region: region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      
      // List buckets to validate credentials
      try {
        const { Buckets } = await client.send(new ListBucketsCommand({}));
        
        if (Buckets && Buckets.length > 0) {
          return res.json({ 
            valid: true, 
            buckets: Buckets 
          });
        } else {
          return res.json({ 
            valid: false, 
            error: "No buckets found in this account" 
          });
        }
      } catch (error: any) {
        console.error("Error validating S3 credentials:", error);
        
        let errorMessage = "Failed to validate credentials";
        
        if (error.name) {
          switch(error.name) {
            case 'InvalidAccessKeyId':
              errorMessage = "The Access Key ID you provided does not exist in AWS records";
              break;
            case 'SignatureDoesNotMatch':
              errorMessage = "The Secret Access Key is incorrect";
              break;
            case 'AccessDenied':
              errorMessage = "Access denied. Your IAM user doesn't have permission to list buckets";
              break;
            case 'ExpiredToken':
              errorMessage = "Your AWS token has expired";
              break;
            default:
              errorMessage = `AWS error: ${error.name}. ${error.message || ''}`;
          }
        }
        
        return res.status(400).json({ 
          valid: false, 
          error: errorMessage 
        });
      }
    } catch (error) {
      console.error("Server error validating S3 credentials:", error);
      res.status(500).json({ 
        valid: false,
        error: "Server error when validating credentials" 
      });
    }
  });
  
  // S3 Operations Routes
  app.get("/api/s3/:accountId/buckets", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      
      // Check if account belongs to user
      const account = await storage.getS3Account(accountId);
      if (!account || account.userId !== req.user!.id) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Create S3 client
      const s3Client = new S3Client({
        region: account.region,
        credentials: {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey,
        },
      });
      
      // List buckets
      const { Buckets } = await s3Client.send(new ListBucketsCommand({}));
      
      res.json(Buckets || []);
    } catch (error) {
      console.error("Error listing buckets:", error);
      res.status(500).json({ message: "Failed to list buckets" });
    }
  });
  
  // Handler to validate bucket accessibility with the configured region
  app.get("/api/s3/:accountId/bucket-region", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { bucket } = req.query;
      
      if (!bucket) {
        return res.status(400).json({ message: "Bucket name is required" });
      }
      
      // Check if account belongs to user
      const account = await storage.getS3Account(accountId);
      if (!account || account.userId !== req.user!.id) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Create an S3 client with the region configured in the account
      const s3Client = new S3Client({
        region: account.region,
        credentials: {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey,
        },
      });
      
      try {
        // Try to list objects with max-keys=0 to check bucket accessibility
        const command = new ListObjectsV2Command({ 
          Bucket: bucket as string,
          MaxKeys: 0
        });
        await s3Client.send(command);
        
        // If successful, return success message
        return res.json({ 
          region: account.region,
          message: "Bucket is accessible with the configured region" 
        });
      } catch (error: any) {
        // Check if it's a permanent redirect indicating wrong region
        if (error.$metadata?.httpStatusCode === 301 && error.Endpoint) {
          // Extract region from endpoint for error message
          let detectedRegion = "unknown";
          const endpointStr = error.Endpoint.toString();
          
          // Try to detect the region from the endpoint
          if (endpointStr.includes('s3.')) {
            const matches = endpointStr.match(/s3\.([a-z0-9\-]+)\.amazonaws\.com/);
            if (matches && matches[1]) {
              detectedRegion = matches[1];
            }
          } else if (endpointStr.includes('s3-')) {
            const matches = endpointStr.match(/s3-([a-z0-9\-]+)/);
            if (matches && matches[1]) {
              detectedRegion = matches[1];
            }
          }
          
          // Return error with helpful message about region mismatch
          return res.status(400).json({ 
            message: "Region mismatch error",
            error: `This bucket appears to be in ${detectedRegion} region, but your account is configured to use ${account.region}. Please update your account settings to use the correct region.`,
            detectedRegion
          });
        }
        
        // If it's another error, return with helpful message
        return res.status(500).json({ 
          message: "Failed to access bucket",
          error: error.message
        });
      }
    } catch (error: any) {
      console.error("Error in bucket-region:", error);
      res.status(500).json({ message: "Failed to validate bucket accessibility" });
    }
  });

  app.get("/api/s3/:accountId/objects", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { bucket, prefix = "", delimiter = "/" } = req.query;
      
      console.log(`Listing objects for bucket: ${bucket}, prefix: ${prefix}, delimiter: ${delimiter}`);
      
      if (!bucket) {
        return res.status(400).json({ message: "Bucket name is required" });
      }
      
      // Check if account belongs to user
      const account = await storage.getS3Account(accountId);
      if (!account || account.userId !== req.user!.id) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      console.log(`Using account: ${account.name}, region: ${account.region}`);
      
      // Prepare the command outside of try blocks so it's available in all scopes
      const listObjectsCommand = new ListObjectsV2Command({
        Bucket: bucket as string,
        Prefix: prefix as string,
        Delimiter: delimiter as string,
      });
      
      console.log(`S3 Command prepared: ListObjectsV2Command for ${bucket as string}`);
      
      let s3Data;
      
      try {
        // Use the explicitly selected region from the account
        console.log(`Creating S3 client with region: ${account.region}`);
        const s3Client = new S3Client({
          region: account.region,
          credentials: {
            accessKeyId: account.accessKeyId,
            secretAccessKey: account.secretAccessKey,
          },
          // Always use forcePathStyle to better handle various bucket names
          forcePathStyle: true,
        });
        
        console.log(`Sending S3 command to list objects in bucket: ${bucket}`);
        s3Data = await s3Client.send(listObjectsCommand);
        console.log(`S3 response received successfully`);
      } catch (error: any) {
        console.error("Error listing objects:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        
        // Check if it's a permanent redirect error indicating wrong region
        if (error.Code === 'PermanentRedirect' && error.Endpoint) {
          // Extract region information for better error message
          const endpointStr = error.Endpoint ? error.Endpoint.toString() : "";
          let detectedRegion = "unknown";
          
          // Try to extract region from endpoint hostname for error message
          if (endpointStr.includes('s3-')) {
            const regionMatch = endpointStr.match(/s3-([a-z0-9-]+)/);
            if (regionMatch && regionMatch[1]) {
              detectedRegion = regionMatch[1];
            }
          } else if (endpointStr.includes('amazonaws.com')) {
            const matches = endpointStr.match(/s3\.([a-z0-9-]+)\.amazonaws\.com/);
            if (matches && matches[1]) {
              detectedRegion = matches[1];
            }
          }
          
          // Return clear error message about region mismatch
          return res.status(400).json({ 
            message: "Region mismatch error", 
            error: `This bucket appears to be in ${detectedRegion} region, but your account is configured to use ${account.region}. Edit your S3 account settings and update the region to match.`
          });
        } else {
          // If it's not a region issue, return the original error
          return res.status(500).json({ 
            message: "Failed to list objects", 
            error: error.message 
          });
        }
      }
      
      // If we got this far, we have data
      if (s3Data) {
        console.log(`Processing S3 response data`);
        // Save path to recently accessed
        const path = `${bucket}/${prefix}`;
        await storage.updateLastAccessed(req.user!.id, path);
        
        // Type assertion for ListObjectsV2CommandOutput
        const typedData = s3Data as {
          Contents?: any[];
          CommonPrefixes?: any[];
        };
        
        console.log(`S3 response contains ${typedData.Contents?.length || 0} objects and ${typedData.CommonPrefixes?.length || 0} folders`);
        
        const response = {
          objects: typedData.Contents || [],
          folders: typedData.CommonPrefixes || [],
          prefix: prefix as string,
          delimiter: delimiter as string,
        };
        
        console.log(`Sending response to client with ${response.objects.length} objects and ${response.folders.length} folders`);
        return res.json(response);
      } else {
        console.log(`No data returned from S3`);
        return res.status(500).json({ message: "No data returned from S3" });
      }
    } catch (error: any) {
      console.error("Unexpected error listing objects:", error);
      res.status(500).json({ 
        message: "Failed to list objects", 
        error: error.message 
      });
    }
  });
  
  app.get("/api/s3/:accountId/download", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { bucket, key } = req.query;
      
      if (!bucket || !key) {
        return res.status(400).json({ message: "Bucket and key are required" });
      }
      
      // Check if account belongs to user
      const account = await storage.getS3Account(accountId);
      if (!account || account.userId !== req.user!.id) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Create S3 client
      const s3Client = new S3Client({
        region: account.region,
        credentials: {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey,
        },
      });
      
      // Create a signed URL for downloading
      const command = new GetObjectCommand({
        Bucket: bucket as string,
        Key: key as string,
      });
      
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      
      res.json({ signedUrl });
    } catch (error) {
      console.error("Error generating download link:", error);
      res.status(500).json({ message: "Failed to generate download link" });
    }
  });
  
  // Batch download objects (generate signed URLs for multiple files)
  app.post("/api/s3/:accountId/batch-download", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { bucket, keys } = req.body;
      
      if (!bucket || !Array.isArray(keys) || keys.length === 0) {
        return res.status(400).json({ message: "Bucket and keys array are required" });
      }
      
      // Check if account belongs to user
      const account = await storage.getS3Account(accountId);
      if (!account || account.userId !== req.user!.id) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Create S3 client
      const s3Client = new S3Client({
        region: account.region,
        credentials: {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey,
        },
      });
      
      // Define types for our URL results
      type UrlResult = { key: string; url: string } | { key: string; error: string };

      // Generate signed URLs for each key
      const urlPromises = keys.map(async (key): Promise<UrlResult> => {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        
        try {
          const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          return { key, url: signedUrl };
        } catch (error) {
          console.error(`Error generating URL for key ${key}:`, error);
          return { key, error: "Failed to generate download URL" };
        }
      });
      
      const results = await Promise.all(urlPromises);
      
      // Format the response as a key-value object
      const urlMap: Record<string, string> = {};
      
      results.forEach(result => {
        if ('url' in result && result.key && result.url) {
          urlMap[result.key] = result.url;
        }
      });
      
      res.json(urlMap);
    } catch (error) {
      console.error("Error generating batch download URLs:", error);
      res.status(500).json({ message: "Failed to generate batch download URLs" });
    }
  });
  
  app.post("/api/s3/:accountId/upload", requireAuth, upload.single("file"), async (req, res) => {
    // Check authentication first
    console.log("Upload request authenticated user:", req.user ? { id: req.user.id, username: req.user.username } : 'No user');
    
    if (!req.user) {
      console.error("Upload attempted without authentication");
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      console.log("Upload request received:", {
        params: req.params,
        body: req.body,
        file: req.file ? {
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : null,
        cookies: req.headers.cookie ? "Present" : "Missing",
        headers: {
          contentType: req.headers['content-type']
        }
      });
      
      const accountId = parseInt(req.params.accountId);
      const { bucket, prefix = "" } = req.body;
      
      if (!bucket || !req.file) {
        console.log("Missing required fields:", { bucket: !!bucket, file: !!req.file });
        return res.status(400).json({ message: "Bucket and file are required" });
      }
      
      // Check if account belongs to user
      const account = await storage.getS3Account(accountId);
      if (!account || account.userId !== req.user!.id) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Create S3 client
      const s3Client = new S3Client({
        region: account.region,
        credentials: {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey,
        },
      });
      
      // Prepare the file
      // Make sure prefix ends with a slash if it doesn't already
      let formattedPrefix = prefix;
      if (formattedPrefix && !formattedPrefix.endsWith('/')) {
        formattedPrefix += '/';
      }
      
      const key = formattedPrefix ? `${formattedPrefix}${req.file.originalname}` : req.file.originalname;
      
      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });
      
      console.log("Executing S3 upload command for bucket:", bucket, "key:", key);
      await s3Client.send(command);
      console.log("S3 upload completed successfully");
      
      res.status(201).json({
        bucket,
        key,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
      console.log("Upload response sent to client");
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });
  
  app.delete("/api/s3/:accountId/objects", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { bucket, key } = req.query;
      
      if (!bucket || !key) {
        return res.status(400).json({ message: "Bucket and key are required" });
      }
      
      // Check if account belongs to user
      const account = await storage.getS3Account(accountId);
      if (!account || account.userId !== req.user!.id) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Create S3 client
      const s3Client = new S3Client({
        region: account.region,
        credentials: {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey,
        },
      });
      
      // Delete object
      const command = new DeleteObjectCommand({
        Bucket: bucket as string,
        Key: key as string,
      });
      
      await s3Client.send(command);
      
      res.json({ message: "Object deleted successfully" });
    } catch (error) {
      console.error("Error deleting object:", error);
      res.status(500).json({ message: "Failed to delete object" });
    }
  });
  
  // Batch delete objects
  app.post("/api/s3/:accountId/batch-delete", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { bucket, keys } = req.body;
      
      if (!bucket || !Array.isArray(keys) || keys.length === 0) {
        return res.status(400).json({ message: "Bucket and keys array are required" });
      }
      
      // Check if account belongs to user
      const account = await storage.getS3Account(accountId);
      if (!account || account.userId !== req.user!.id) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Create S3 client
      const s3Client = new S3Client({
        region: account.region,
        credentials: {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey,
        },
      });
      
      // Use DeleteObjects for batch deletion
      const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map(key => ({ Key: key })),
          Quiet: false,
        },
      });
      
      const result = await s3Client.send(command);
      
      // Define the expected response types from DeleteObjectsCommand
      interface DeletedObject {
        Key?: string;
        VersionId?: string;
        DeleteMarker?: boolean;
        DeleteMarkerVersionId?: string;
      }
      
      interface DeleteError {
        Key?: string;
        VersionId?: string;
        Code?: string;
        Message?: string;
      }
      
      // Process results 
      const deletedObjects = (result.Deleted || []) as DeletedObject[];
      const errorObjects = (result.Errors || []) as DeleteError[];
      
      const deleted = deletedObjects.map(item => item.Key || '');
      const errors = errorObjects.map(error => ({
        key: error.Key || '',
        message: error.Message || 'Unknown error',
      }));
      
      res.json({ deleted, errors });
    } catch (error) {
      console.error("Error deleting objects in batch:", error);
      res.status(500).json({ message: "Failed to delete objects in batch" });
    }
  });
  
  // Shared Files Routes
  app.post("/api/shared-files", requireAuth, async (req, res) => {
    try {
      const { accountId, bucket, path, filename, expiresAt, allowDownload, password } = req.body;
      
      if (!accountId || !bucket || !path || !filename) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if account belongs to user
      const account = await storage.getS3Account(parseInt(accountId));
      if (!account || account.userId !== req.user!.id) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Get file size and content type
      const s3Client = new S3Client({
        region: account.region,
        credentials: {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey,
        },
      });
      
      // Check if file exists and get metadata
      const headCommand = new HeadObjectCommand({
        Bucket: bucket,
        Key: path,
      });
      
      const headResponse = await s3Client.send(headCommand);
      
      // Generate share token
      const shareToken = randomBytes(16).toString("hex");
      
      // Hash password if provided
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
      
      // Create shared file record
      const sharedFile = await storage.createSharedFile({
        userId: req.user!.id,
        accountId: parseInt(accountId),
        bucket,
        path,
        filename,
        filesize: headResponse.ContentLength || 0,
        contentType: headResponse.ContentType,
        shareToken,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        allowDownload: allowDownload !== false,
        password: hashedPassword,
      });
      
      res.status(201).json({
        ...sharedFile,
        shareUrl: `${req.protocol}://${req.get("host")}/shared/${shareToken}`,
      });
    } catch (error) {
      console.error("Error creating shared file:", error);
      res.status(500).json({ message: "Failed to create shared file" });
    }
  });
  
  app.get("/api/shared-files", requireAuth, async (req, res) => {
    try {
      const sharedFiles = await storage.getSharedFiles(req.user!.id);
      
      // Add share URLs
      const filesWithUrls = sharedFiles.map((file) => ({
        ...file,
        shareUrl: `${req.protocol}://${req.get("host")}/shared/${file.shareToken}`,
      }));
      
      res.json(filesWithUrls);
    } catch (error) {
      console.error("Error fetching shared files:", error);
      res.status(500).json({ message: "Failed to fetch shared files" });
    }
  });
  
  app.delete("/api/shared-files/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if file belongs to user
      const sharedFile = await storage.getSharedFile(id);
      if (!sharedFile || sharedFile.userId !== req.user!.id) {
        return res.status(404).json({ message: "Shared file not found" });
      }
      
      // Delete the shared file
      await storage.deleteSharedFile(id);
      
      res.json({ message: "Shared file deleted successfully" });
    } catch (error) {
      console.error("Error deleting shared file:", error);
      res.status(500).json({ message: "Failed to delete shared file" });
    }
  });
  
  // Public shared file access route
  app.get("/api/shared/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.query;
      
      // Get shared file
      const sharedFile = await storage.getSharedFileByToken(token);
      
      if (!sharedFile) {
        return res.status(404).json({ message: "Shared file not found or expired" });
      }
      
      // Check password if required
      if (sharedFile.password) {
        if (!password) {
          return res.status(401).json({ passwordRequired: true, message: "Password required" });
        }
        
        const passwordValid = await bcrypt.compare(password as string, sharedFile.password);
        if (!passwordValid) {
          return res.status(401).json({ message: "Invalid password" });
        }
      }
      
      // Get S3 account
      const account = await storage.getS3Account(sharedFile.accountId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Create S3 client
      const s3Client = new S3Client({
        region: account.region,
        credentials: {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey,
        },
      });
      
      // Generate signed URL for download or view
      const command = new GetObjectCommand({
        Bucket: sharedFile.bucket,
        Key: sharedFile.path,
      });
      
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      
      res.json({
        filename: sharedFile.filename,
        contentType: sharedFile.contentType,
        filesize: sharedFile.filesize,
        signedUrl,
        allowDownload: sharedFile.allowDownload,
        expiresAt: sharedFile.expiresAt,
      });
    } catch (error) {
      console.error("Error accessing shared file:", error);
      res.status(500).json({ message: "Failed to access shared file" });
    }
  });
  
  // User Settings Routes
  app.get("/api/user-settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getUserSettings(req.user!.id);
      
      if (!settings) {
        // Create default settings if none exist
        const newSettings = await storage.createOrUpdateUserSettings({
          userId: req.user!.id,
          theme: "light",
          notifications: true,
        });
        
        return res.json(newSettings);
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });
  
  app.put("/api/user-settings", requireAuth, async (req, res) => {
    try {
      const { theme, defaultAccountId, notifications } = req.body;
      
      // If defaultAccountId is provided, check if it belongs to user
      if (defaultAccountId) {
        const account = await storage.getS3Account(defaultAccountId);
        if (!account || account.userId !== req.user!.id) {
          return res.status(400).json({ message: "Invalid account ID" });
        }
      }
      
      // Get current settings
      const currentSettings = await storage.getUserSettings(req.user!.id);
      
      // Update settings
      const settings = await storage.createOrUpdateUserSettings({
        userId: req.user!.id,
        theme: theme || currentSettings?.theme || "light",
        defaultAccountId: defaultAccountId !== undefined ? defaultAccountId : currentSettings?.defaultAccountId,
        notifications: notifications !== undefined ? notifications : currentSettings?.notifications || true,
        lastAccessed: currentSettings?.lastAccessed || [],
      });
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });

  return httpServer;
}

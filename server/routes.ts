import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertS3AccountSchema, 
  insertSharedFileSchema, 
  users, 
  s3Accounts, 
  sharedFiles, 
  adminLogs 
} from "@shared/schema";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { setupAuth, requireAuth } from "./auth";
import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand, HeadBucketCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import { Readable } from "stream";
import { db } from "./db";
import { eq, desc, inArray } from "drizzle-orm";

// Helper function to convert null to undefined
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

// Define types for authenticated requests
declare global {
  namespace Express {
    // User will be handled by Replit Auth
    
    // Add multer file to Request type
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

// Add user ID extraction utility for route handlers
interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  
  // Setup auth with local strategy
  setupAuth(app);
  
  // Clear out any authentication error logs
  console.log("Traditional authentication enabled");
  
  // Admin middleware to check if user is authorized
  const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const user = req.user as any;
    // Allow access if the user has admin role
    if (user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    next();
  };
  
  // Add middleware to extract userId for convenience
  app.use((req: AuthenticatedRequest, res, next) => {
    if (req.isAuthenticated() && req.user) {
      // Store user ID for convenience in route handlers
      req.userId = req.user.id;
    }
    next();
  });
  
  // Middleware to log authentication status
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') && !req.path.includes('/api/user')) {
      console.log(`Auth check for ${req.method} ${req.path}: ${req.isAuthenticated() ? 'Authenticated' : 'Not authenticated'}`);
    }
    next();
  });
  
  // Configure multer for file uploads
  const upload = multer({ storage: multer.memoryStorage() });
  
  // User routes for traditional authentication
  
  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // User is already attached to the request by passport
    res.json(req.user);
  });
  
  // ==== ADMIN API ROUTES ====
  
  // Get admin dashboard statistics
  app.get("/api/admin/stats", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      // Get all users
      const allUsers = await db.select().from(users);
      
      // Get accounts count
      const accountsResult = await db.select().from(s3Accounts);
      
      // Get shared files
      const sharedFilesResult = await db.select().from(sharedFiles);
      
      // Get active shared files (not expired)
      const now = new Date();
      const activeSharedFiles = sharedFilesResult.filter((file: any) => 
        !file.expiresAt || new Date(file.expiresAt) > now
      );
      
      // Calculate new users in the last week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newUsersThisWeek = allUsers.filter((user: any) => 
        user.createdAt && new Date(user.createdAt) > oneWeekAgo
      ).length;
      
      // Calculate active subscriptions
      const paidSubscriptions = allUsers.filter((user: any) => 
        user.subscriptionPlan && user.subscriptionPlan !== 'free'
      ).length;
      
      // Calculate subscription conversion rate
      const subscriptionConversionRate = allUsers.length > 0 ? 
        (paidSubscriptions / allUsers.length) * 100 : 0;
      
      // Prepare stats to return
      const stats = {
        totalUsers: allUsers.length,
        newUsersThisWeek,
        activeSubscriptions: paidSubscriptions,
        subscriptionConversionRate: Math.round(subscriptionConversionRate * 10) / 10, // Round to 1 decimal place
        totalAccounts: accountsResult.length,
        totalStorageUsed: "Calculation pending", // Would require S3 API calls to calculate
        totalSharedFiles: sharedFilesResult.length,
        activeSharedFiles: activeSharedFiles.length
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error retrieving admin stats:", error);
      res.status(500).json({ message: "Failed to retrieve admin statistics" });
    }
  });
  
  // Get users for admin management
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const usersList = await db.select().from(users);
      
      // Sort by creation date descending (newest first)
      usersList.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      res.json(usersList);
    } catch (error) {
      console.error("Error retrieving users list:", error);
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });
  
  // Update user (role, subscription, status)
  app.patch("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user in database
      const updatedUser = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
      
      if (!updatedUser || updatedUser.length === 0) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      // Log admin action
      await db.insert(adminLogs).values({
        adminId: req.user!.id,
        targetUserId: userId,
        action: "update_user",
        details: updateData,
        ip: req.ip || "unknown"
      });
      
      res.json(updatedUser[0]);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Get admin logs
  app.get("/api/admin/logs", requireAdmin, async (req, res) => {
    try {
      // Get all logs, ordered by most recent first
      const logs = await db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt));
      
      // Get all users for lookup purposes
      const allUsers = await db.select().from(users);
      
      // Create a map for quick lookup
      const usersMap = new Map();
      
      allUsers.forEach((user: any) => {
        usersMap.set(user.id, user.username || user.email || "Unknown User");
      });
      
      // Add usernames to the logs
      const enhancedLogs = logs.map((log: any) => ({
        ...log,
        adminUsername: usersMap.get(log.adminId) || "Unknown Admin",
        targetUsername: log.targetUserId ? usersMap.get(log.targetUserId) || "Unknown User" : null
      }));
      
      res.json(enhancedLogs);
    } catch (error) {
      console.error("Error retrieving admin logs:", error);
      res.status(500).json({ message: "Failed to retrieve admin logs" });
    }
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
      
      // Check if bucket already exists in another account owned by this user
      if (selectedBucket) {
        const existingAccounts = await storage.getS3Accounts(req.user!.id);
        const duplicateBucket = existingAccounts.find(account => 
          account.defaultBucket === selectedBucket &&
          !(account.accessKeyId === accountData.accessKeyId && 
            account.secretAccessKey === accountData.secretAccessKey)
        );
        
        if (duplicateBucket) {
          console.error(`Bucket '${selectedBucket}' is already added to account '${duplicateBucket.name}'`);
          return res.status(400).json({ 
            message: `This bucket is already added to account '${duplicateBucket.name}'. Each bucket can only be used with one account.` 
          });
        }
      }
      
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
  app.post("/api/s3/:accountId/batch-copy", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { sourceBucket, destinationBucket, destinationPrefix = "", keys } = req.body;
      
      if (!sourceBucket || !destinationBucket || !keys || !Array.isArray(keys)) {
        return res.status(400).json({ message: "Missing required parameters" });
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
      
      // Copy objects
      const copied: string[] = [];
      const errors: { key: string; message: string }[] = [];
      
      for (const key of keys) {
        try {
          // Determine the destination key (keeping same filename but with new prefix)
          const fileName = key.split('/').pop();
          const destKey = destinationPrefix ? `${destinationPrefix}${destinationPrefix.endsWith('/') ? '' : '/'}${fileName}` : fileName;
          
          // Create copy command
          const command = new CopyObjectCommand({
            Bucket: destinationBucket,
            CopySource: `${sourceBucket}/${encodeURIComponent(key)}`,
            Key: destKey,
          });
          
          // Execute copy
          await s3Client.send(command);
          copied.push(key);
        } catch (error: any) {
          console.error(`Error copying object ${key}:`, error);
          errors.push({ key, message: error.message || "Unknown error" });
        }
      }
      
      res.json({ copied, errors });
    } catch (error: any) {
      console.error("Unexpected error copying objects:", error);
      res.status(500).json({ 
        message: "Failed to copy objects", 
        error: error.message 
      });
    }
  });
  
  app.post("/api/s3/:accountId/batch-move", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { sourceBucket, destinationBucket, destinationPrefix = "", keys } = req.body;
      
      if (!sourceBucket || !destinationBucket || !keys || !Array.isArray(keys)) {
        return res.status(400).json({ message: "Missing required parameters" });
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
      
      // Move objects (copy then delete)
      const moved: string[] = [];
      const errors: { key: string; message: string }[] = [];
      
      for (const key of keys) {
        try {
          // Determine the destination key (keeping same filename but with new prefix)
          const fileName = key.split('/').pop();
          const destKey = destinationPrefix ? `${destinationPrefix}${destinationPrefix.endsWith('/') ? '' : '/'}${fileName}` : fileName;
          
          // 1. Copy the object to the destination
          const copyCommand = new CopyObjectCommand({
            Bucket: destinationBucket,
            CopySource: `${sourceBucket}/${encodeURIComponent(key)}`,
            Key: destKey,
          });
          
          await s3Client.send(copyCommand);
          
          // 2. Delete the original object
          const deleteCommand = new DeleteObjectCommand({
            Bucket: sourceBucket,
            Key: key,
          });
          
          await s3Client.send(deleteCommand);
          
          moved.push(key);
        } catch (error: any) {
          console.error(`Error moving object ${key}:`, error);
          errors.push({ key, message: error.message || "Unknown error" });
        }
      }
      
      res.json({ moved, errors });
    } catch (error: any) {
      console.error("Unexpected error moving objects:", error);
      res.status(500).json({ 
        message: "Failed to move objects", 
        error: error.message 
      });
    }
  });
  
  app.post("/api/s3/:accountId/rename", requireAuth, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { bucket, sourceKey, newName } = req.body;
      
      if (!bucket || !sourceKey || !newName) {
        return res.status(400).json({ message: "Missing required parameters" });
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
      
      // Get the directory path if exists
      const pathParts = sourceKey.split('/');
      pathParts.pop(); // Remove the filename
      const directoryPath = pathParts.length > 0 ? pathParts.join('/') + '/' : '';
      
      // Create the new key with the directory path and new filename
      const newKey = directoryPath + newName;
      
      // 1. Copy the object with the new name
      const copyCommand = new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${encodeURIComponent(sourceKey)}`,
        Key: newKey,
      });
      
      await s3Client.send(copyCommand);
      
      // 2. Delete the original object
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucket,
        Key: sourceKey,
      });
      
      await s3Client.send(deleteCommand);
      
      res.json({ newKey });
    } catch (error: any) {
      console.error("Unexpected error renaming object:", error);
      res.status(500).json({ 
        message: "Failed to rename object", 
        error: error.message 
      });
    }
  });
  
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
      const { 
        accountId, 
        bucket, 
        path, 
        filename, 
        filesize,
        contentType,
        expiresAt, 
        allowDownload,
        password,
        isPublic,
        // Advanced permission settings
        permissionLevel, 
        accessType,
        allowedDomains,
        maxDownloads,
        notifyOnAccess,
        watermarkEnabled,
        // Recipients for specific sharing 
        recipients
      } = req.body;
      
      if (!accountId || !bucket || !path || !filename) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if account belongs to user
      const account = await storage.getS3Account(parseInt(accountId));
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
      
      // Check if file exists and get metadata if not provided
      let fileMetadata = {
        ContentLength: filesize,
        ContentType: contentType
      };
      
      if (!fileMetadata.ContentLength || !fileMetadata.ContentType) {
        const headCommand = new HeadObjectCommand({
          Bucket: bucket,
          Key: path,
        });
        
        const headResponse = await s3Client.send(headCommand);
        fileMetadata = {
          ContentLength: headResponse.ContentLength,
          ContentType: headResponse.ContentType
        };
      }
      
      // Generate share token
      const shareToken = randomBytes(16).toString("hex");
      
      // Hash password if provided
      let hashedPassword = null;
      if (password) {
        // Use crypto for password hashing
        const salt = randomBytes(16).toString("hex");
        const scryptAsync = promisify(scrypt);
        const hash = await scryptAsync(password, salt, 64) as Buffer;
        hashedPassword = `${hash.toString("hex")}.${salt}`;
      }
      
      // Create shared file record with advanced permissions
      const sharedFile = await storage.createSharedFile({
        userId: req.user!.id,
        accountId: parseInt(accountId),
        bucket,
        path,
        filename,
        filesize: fileMetadata.ContentLength || 0,
        contentType: fileMetadata.ContentType,
        shareToken,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        // Permission settings
        allowDownload: allowDownload !== false,
        permissionLevel: permissionLevel || 'view',
        accessType: accessType || 'public',
        // Security settings
        password: hashedPassword,
        isPublic: isPublic === true,
        allowedDomains: Array.isArray(allowedDomains) ? allowedDomains : undefined,
        // Advanced settings
        maxDownloads: typeof maxDownloads === 'number' ? maxDownloads : null,
        notifyOnAccess: notifyOnAccess === true,
        watermarkEnabled: watermarkEnabled === true,
      });
      
      // Process recipient emails if provided
      if (Array.isArray(recipients) && recipients.length > 0) {
        // Create recipient records for each email
        await Promise.all(recipients.map(async (email: string) => {
          if (typeof email === 'string' && email.trim().length > 0) {
            try {
              await storage.createFileRecipient({
                fileId: sharedFile.id,
                email: email.trim().toLowerCase(),
                permissionLevel: permissionLevel || 'view',
              });
            } catch (error) {
              console.error(`Failed to add recipient ${email}:`, error);
              // Continue with other recipients if one fails
            }
          }
        }));
      }
      
      // Generate a direct S3 link that will work regardless of app state
      const s3Url = new URL(`https://${bucket}.s3.${account.region}.amazonaws.com/${path}`);
      
      // Create a share URL that contains both our app URL and a direct S3 URL
      res.status(201).json({
        ...sharedFile,
        shareUrl: `${req.protocol}://${req.get("host")}/shared/${shareToken}`,
        directS3Url: s3Url.toString()
      });
    } catch (error) {
      console.error("Error creating shared file:", error);
      res.status(500).json({ message: "Failed to create shared file" });
    }
  });
  
  app.get("/api/shared-files", requireAuth, async (req, res) => {
    try {
      const sharedFiles = await storage.getSharedFiles(req.user!.id);
      
      // Add share URLs with direct S3 URLs as backup
      const filesWithUrls = await Promise.all(sharedFiles.map(async (file) => {
        // Get account info to build direct S3 URL
        const account = await storage.getS3Account(file.accountId);
        let directS3Url = null;
        
        if (account) {
          // Create a direct S3 URL that works regardless of app state
          const s3Url = new URL(`https://${file.bucket}.s3.${account.region}.amazonaws.com/${file.path}`);
          directS3Url = s3Url.toString();
        }
        
        // Make sure accessCount is included and is at least 0
        const accessCount = typeof file.accessCount === 'number' ? file.accessCount : 0;
        
        return {
          ...file,
          accessCount,
          shareUrl: `${req.protocol}://${req.get("host")}/shared/${file.shareToken}`,
          directS3Url
        };
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
  
  // API endpoint to expire a shared file (mark as expired without deleting)
  app.patch("/api/shared-files/:id/expire", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if file belongs to user
      const sharedFile = await storage.getSharedFile(id);
      if (!sharedFile || sharedFile.userId !== req.user!.id) {
        return res.status(404).json({ message: "Shared file not found" });
      }
      
      // Update the shared file to mark it as expired
      const updatedFile = await storage.updateSharedFile(id, { 
        isExpired: true 
      });
      
      res.json({
        ...updatedFile,
        message: "Shared file expired successfully"
      });
    } catch (error) {
      console.error("Error expiring shared file:", error);
      res.status(500).json({ message: "Failed to expire shared file" });
    }
  });
  
  // API endpoint to toggle public access for a shared file
  app.patch("/api/shared-files/:id/toggle-public", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isPublic } = req.body;
      
      // Check if file belongs to user
      const sharedFile = await storage.getSharedFile(id);
      if (!sharedFile || sharedFile.userId !== req.user!.id) {
        return res.status(404).json({ message: "Shared file not found" });
      }
      
      // Update the shared file to toggle public access
      const updatedFile = await storage.updateSharedFile(id, { 
        isPublic: !!isPublic 
      });
      
      res.json({
        ...updatedFile,
        message: isPublic ? "Public access enabled" : "Public access disabled"
      });
    } catch (error) {
      console.error("Error updating shared file public access:", error);
      res.status(500).json({ message: "Failed to update shared file" });
    }
  });
  
  // File access logs route - get access history for a shared file
  app.get("/api/shared-files/:id/access-logs", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if file belongs to user
      const sharedFile = await storage.getSharedFile(id);
      if (!sharedFile || sharedFile.userId !== req.user!.id) {
        return res.status(404).json({ message: "Shared file not found" });
      }
      
      // Get access logs
      const accessLogs = await storage.getFileAccessLogs(id);
      
      // Format logs for better client-side rendering
      const formattedLogs = accessLogs.map(log => ({
        ...log,
        // Format dates as ISO strings
        accessedAt: log.accessedAt instanceof Date ? log.accessedAt.toISOString() : log.accessedAt,
        // Redact IP addresses slightly for privacy (show only first part)
        ipAddress: log.ipAddress ? log.ipAddress.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.xxx.xxx') : 'unknown',
        // Truncate very long user agents
        userAgent: log.userAgent && log.userAgent.length > 100 
          ? log.userAgent.substring(0, 100) + '...' 
          : log.userAgent,
      }));
      
      res.json(formattedLogs);
    } catch (error) {
      console.error("Error fetching access logs:", error);
      res.status(500).json({ message: "Failed to fetch access logs" });
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
      
      // Check if the file is manually expired or date expired
      if (sharedFile.isExpired || (sharedFile.expiresAt && new Date(sharedFile.expiresAt) < new Date())) {
        return res.status(403).json({ message: "This shared link has expired" });
      }
      
      // Check password if required
      if (sharedFile.password) {
        if (!password) {
          return res.status(401).json({ passwordRequired: true, message: "Password required" });
        }
        
        // Compare passwords using crypto
        const [hashed, salt] = sharedFile.password.split(".");
        const hashedBuf = Buffer.from(hashed, "hex");
        const scryptAsync = promisify(scrypt);
        const suppliedBuf = await scryptAsync(password as string, salt, 64) as Buffer;
        const passwordValid = timingSafeEqual(hashedBuf, suppliedBuf);
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
      
      // Create a direct S3 URL as a fallback option (only include if file is marked as public)
      // This URL can be used for embedding in websites or as a fallback when our signed URLs aren't suitable
      const directS3Url = sharedFile.isPublic 
        ? `https://${sharedFile.bucket}.s3.${account.region}.amazonaws.com/${sharedFile.path}`
        : undefined;
      
      // Log the file access
      try {
        await storage.logFileAccess({
          fileId: sharedFile.id,
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          referrer: req.headers.referer || 'direct',
          isDownload: req.query.download === 'true',
        });
        
        console.log(`Access logged for shared file ${sharedFile.id}`);
      } catch (logError) {
        // Just log the error but continue with the response
        console.error("Error logging file access:", logError);
      }
      
      res.json({
        filename: sharedFile.filename,
        contentType: sharedFile.contentType,
        filesize: sharedFile.filesize,
        signedUrl,
        directS3Url, // Add direct S3 URL to the response
        allowDownload: sharedFile.allowDownload,
        expiresAt: sharedFile.expiresAt,
        accessCount: sharedFile.accessCount, // Include access count in response
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

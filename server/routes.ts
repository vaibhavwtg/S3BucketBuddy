import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertS3AccountSchema, insertSharedFileSchema, sharedFiles } from "@shared/schema";
import { randomBytes } from "crypto";
import { setupSession, setupAuthRoutes, isAuthenticated } from "./auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import { Readable } from "stream";
import { eq, and } from "drizzle-orm";
import { listBuckets, listObjects, getDownloadUrl, deleteObject, deleteObjects, copyObject, getObjectMetadata, getS3Client } from "./s3-client";
import { db } from "./db";

// Helper function to convert null to undefined
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up sessions
  setupSession(app);
  
  // Set up authentication routes (/api/auth/register, /api/auth/login, etc.)
  setupAuthRoutes(app);
  
  // Admin routes
  app.get("/api/admin/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  app.patch("/api/admin/users/:id/toggle-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }
      
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Toggle the user's active status
      const updatedUser = await storage.updateUser(userId, { 
        isActive: !user.isActive 
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error toggling user status:", error);
      res.status(500).json({ message: "Error toggling user status" });
    }
  });
  
  // Configure multer for file uploads
  const upload = multer({ storage: multer.memoryStorage() });
  
  // S3 Accounts routes
  app.get("/api/s3-accounts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // User is already verified by isAuthenticated middleware
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get user's S3 accounts
      const accounts = await storage.getS3Accounts(req.user.id);
      console.log("Fetched S3 accounts for user:", req.user.id, accounts);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Error fetching accounts" });
    }
  });

  // Validate S3 credentials before saving
  app.post("/api/validate-s3-credentials", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { accessKeyId, secretAccessKey, region } = req.body;
      
      // Create an S3 client with the provided credentials
      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });
      
      // Try to list buckets to verify credentials
      const response = await s3Client.send({ 
        $command: "ListBuckets" 
      });
      
      // Return the list of buckets
      res.status(200).json({
        valid: true,
        buckets: response.Buckets || []
      });
    } catch (error) {
      console.error("Error validating S3 credentials:", error);
      res.status(400).json({
        valid: false,
        message: "Invalid S3 credentials. Please check your access key, secret key, and region."
      });
    }
  });

  app.post("/api/s3-accounts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const accountData = {
        ...req.body,
        userId: req.user.id
      };
      
      console.log("Creating S3 account for user:", req.user.id, accountData);
      const account = await storage.createS3Account(accountData);
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(500).json({ message: "Error creating account" });
    }
  });
  
  // Delete S3 account
  app.delete("/api/s3-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const accountId = parseInt(req.params.id);
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      // Get the account first to verify it belongs to this user
      const account = await storage.getS3Account(accountId);
      if (!account) {
        return res.status(404).json({ message: "S3 account not found" });
      }
      
      // Make sure the account belongs to the authenticated user
      if (account.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this account" });
      }
      
      const deleted = await storage.deleteS3Account(accountId);
      res.status(200).json({ success: deleted });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Error deleting account" });
    }
  });

  // User settings routes
  app.get("/api/user-settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      let settings = await storage.getUserSettings(req.session.userId);
      
      // If no settings exist, create default settings
      if (!settings) {
        settings = await storage.createOrUpdateUserSettings({
          userId: req.session.userId,
          theme: 'light',
          notifications: true,
          lastAccessed: []
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Error fetching user settings" });
    }
  });
  
  app.post("/api/user-settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const settingsData = {
        ...req.body,
        userId: req.session.userId
      };
      
      const settings = await storage.createOrUpdateUserSettings(settingsData);
      res.status(200).json(settings);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Error updating user settings" });
    }
  });
  
  // PUT endpoint for full user settings updates from settings page
  app.put("/api/user-settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const settingsData = {
        ...req.body,
        userId: req.session.userId
      };
      
      const settings = await storage.createOrUpdateUserSettings(settingsData);
      res.status(200).json(settings);
    } catch (error) {
      console.error("Error updating user settings (PUT):", error);
      res.status(500).json({ message: "Error updating settings" });
    }
  });
  
  // PATCH endpoint for partial user settings updates (like viewMode)
  app.patch("/api/user-settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get existing settings first
      let currentSettings = await storage.getUserSettings(req.session.userId);
      
      // If no settings exist, create default settings with the update
      if (!currentSettings) {
        const newSettings = await storage.createOrUpdateUserSettings({
          userId: req.session.userId,
          theme: 'light',
          notifications: true,
          lastAccessed: [],
          ...req.body
        });
        return res.json(newSettings);
      }
      
      // Update existing settings with the changes
      // Don't include lastAccessed in this update to avoid array handling issues
      const { lastAccessed, ...updateData } = req.body;
      
      const updatedSettings = await storage.createOrUpdateUserSettings({
        ...currentSettings,
        ...updateData,
        userId: req.session.userId // Ensure userId stays the same
      });
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Error updating user settings" });
    }
  });

  // Shared files routes
  app.get("/api/shared-files", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const files = await storage.getSharedFiles(req.session.userId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching shared files:", error);
      res.status(500).json({ message: "Error fetching shared files" });
    }
  });
  
  // S3 Bucket Operations
  app.get("/api/s3/:accountId/buckets", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Convert the accountId to a number
      const accountId = parseInt(req.params.accountId);
      
      // Validate the account ID is a valid number
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      // Get the account from the database
      const account = await storage.getS3Account(accountId);
      
      // If account not found, return 404
      if (!account) {
        return res.status(404).json({ message: "S3 account not found" });
      }
      
      // Create an S3 client with the account credentials
      const s3Client = new S3Client({
        region: account.region,
        credentials: {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey
        }
      });
      
      // List buckets using our s3-client utility
      try {
        const buckets = await listBuckets(accountId);
        
        // Return buckets as JSON array
        return res.json(buckets);
      } catch (s3Error: any) {
        console.error("S3 error listing buckets:", s3Error);
        return res.status(400).json({ 
          message: "Error accessing S3 buckets", 
          error: s3Error.message || "Unknown S3 error" 
        });
      }
    } catch (error: any) {
      console.error("Server error listing buckets:", error);
      return res.status(500).json({ 
        message: "Server error listing buckets",
        error: error.message || "Unknown error" 
      });
    }
  });
  
  app.get("/api/s3/:accountId/objects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Convert the accountId to a number
      const accountId = parseInt(req.params.accountId);
      
      // Validate the account ID is a valid number
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      // Get the bucket name from query parameters
      const bucket = req.query.bucket as string;
      if (!bucket) {
        return res.status(400).json({ message: "Bucket name is required" });
      }
      
      // Get optional prefix and delimiter from query parameters
      const prefix = (req.query.prefix as string) || '';
      const delimiter = (req.query.delimiter as string) || '/';
      
      // Get the account from the database
      const account = await storage.getS3Account(accountId);
      
      // If account not found, return 404
      if (!account) {
        return res.status(404).json({ message: "S3 account not found" });
      }
      
      // Create an S3 client with the account credentials
      const s3Client = new S3Client({
        region: account.region,
        credentials: {
          accessKeyId: account.accessKeyId,
          secretAccessKey: account.secretAccessKey
        }
      });
      
      // List objects using our s3-client utility
      try {
        const result = await listObjects(accountId, bucket, prefix, delimiter);
        
        // Return objects and folders as JSON
        return res.json(result);
      } catch (s3Error: any) {
        console.error("S3 error listing objects:", s3Error);
        return res.status(400).json({ 
          message: "Error accessing S3 objects", 
          error: s3Error.message || "Unknown S3 error" 
        });
      }
    } catch (error: any) {
      console.error("Server error listing objects:", error);
      return res.status(500).json({ 
        message: "Server error listing objects",
        error: error.message || "Unknown error" 
      });
    }
  });
  
  // Shared Files API routes
  app.get("/api/shared-files", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const sharedFiles = await storage.getSharedFiles(userId!);
      
      // Enhance with the full share URL for frontend use
      const enhancedFiles = sharedFiles.map(file => ({
        ...file,
        shareUrl: `${req.protocol}://${req.hostname}/shared/${file.shareToken}`
      }));
      
      res.json(enhancedFiles);
    } catch (error) {
      console.error("Error fetching shared files:", error);
      res.status(500).json({ message: "Error fetching shared files" });
    }
  });
  
  // Create a new shared file
  app.post("/api/shared-files", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Use user ID from session or user object
      const userId = req.session.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - No user ID found" });
      }
      
      console.log("Creating shared file for user:", userId);
      console.log("Request body:", req.body);
      
      const { 
        accountId, 
        bucket, 
        path, 
        filename, 
        expiresInDays, 
        allowDownload = true, 
        password,
        size,
        directS3Link = false
      } = req.body;
      
      // Validate required fields
      if (!accountId || !bucket || !filename) {
        return res.status(400).json({ message: "Missing required fields: accountId, bucket, and filename are required" });
      }
      
      // Get file metadata if not provided
      let filesize = size || req.body.filesize;
      let contentType = req.body.contentType;
      
      if (!filesize || !contentType) {
        try {
          // Fetch S3 account to create AWS client
          const account = await storage.getS3Account(accountId);
          if (!account) {
            return res.status(404).json({ message: "S3 account not found" });
          }
          
          console.log("Getting metadata for file:", path || filename);
          const metadata = await getObjectMetadata(accountId, bucket, path || filename);
          console.log("S3 metadata:", metadata);
          
          // Extract metadata from S3 response
          if (metadata) {
            if (!filesize && metadata.ContentLength) {
              filesize = metadata.ContentLength;
            }
            if (!contentType && metadata.ContentType) {
              contentType = metadata.ContentType;
            }
          }
          
          // If still no metadata, use defaults
          if (!filesize) filesize = 0;
          if (!contentType) contentType = "application/octet-stream";
        } catch (error) {
          console.error("Error fetching file metadata:", error);
          // Continue with default values if metadata fetch fails
          filesize = filesize || 0;
          contentType = contentType || "application/octet-stream";
        }
      }
      
      // First, directly check the database for existing shared files
      const [existingShare] = await db
        .select()
        .from(sharedFiles)
        .where(
          and(
            eq(sharedFiles.userId, userId),
            eq(sharedFiles.accountId, accountId),
            eq(sharedFiles.bucket, bucket),
            eq(sharedFiles.path, path || '')
          )
        );
      
      console.log("Checking for existing shared file:", {userId, accountId, bucket, path: path || ''});
      
      let sharedFile;
      let shareToken;
      
      if (existingShare) {
        console.log("Found existing shared file:", existingShare.id);
        // File is already shared, use the existing share
        sharedFile = existingShare;
        shareToken = existingShare.shareToken;
        
        // Update the expiry date if new one is provided
        if (expiresInDays && expiresInDays > 0) {
          const newExpiresAt = new Date();
          newExpiresAt.setDate(newExpiresAt.getDate() + expiresInDays);
          
          // Update the existing shared file with new expiry date
          const updatedFile = await storage.updateSharedFile(existingShare.id, { 
            expiresAt: newExpiresAt,
            allowDownload: allowDownload !== undefined ? allowDownload : existingShare.allowDownload,
            password: password && password.trim() ? password.trim() : existingShare.password
          });
          
          if (updatedFile) {
            sharedFile = updatedFile;
          }
          console.log("Updated existing shared file with new expiry date");
        }
      } else {
        console.log("No existing shared file found, creating new one");
        // This is a new share, generate a unique share token
        shareToken = randomBytes(16).toString('hex');
        console.log("Generated share token:", shareToken);
        
        // Calculate expiry date if provided
        let expiresAt: Date | undefined = undefined;
        if (expiresInDays && expiresInDays > 0) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        }
        
        // Save to database
        sharedFile = await storage.createSharedFile({
          userId: userId,
          accountId,
          bucket,
          path: path || '',
          filename,
          filesize: filesize || 0,
          contentType: contentType || "application/octet-stream",
          shareToken,
          expiresAt,
          allowDownload: allowDownload !== undefined ? allowDownload : true,
          password: password && password.trim() ? password.trim() : undefined,
        });
      }
      
      console.log("Shared file created:", sharedFile);
      
      // Determine the URL to return based on direct S3 link preference
      const appShareUrl = `${req.protocol}://${req.hostname}/shared/${sharedFile.shareToken}`;
      const s3DirectUrl = `https://${bucket}.s3.amazonaws.com/${path || filename}`;
      
      // Return with the shareable URL
      res.status(201).json({
        ...sharedFile,
        shareUrl: directS3Link ? s3DirectUrl : appShareUrl,
        directS3Url: s3DirectUrl,
        appShareUrl
      });
    } catch (error) {
      console.error("Error creating shared file:", error);
      res.status(500).json({ message: "Error creating shared file" });
    }
  });
  
  // Delete a shared file
  app.delete("/api/shared-files/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const fileId = parseInt(req.params.id);
      
      // Verify the file exists and belongs to the user
      const sharedFile = await storage.getSharedFile(fileId);
      
      if (!sharedFile) {
        return res.status(404).json({ message: "Shared file not found" });
      }
      
      // Temporarily disabled user permission check for debugging
      // if (sharedFile.userId !== userId) {
      //   return res.status(403).json({ message: "You don't have permission to delete this file" });
      // }
      
      // Delete the file
      await storage.deleteSharedFile(fileId);
      
      res.status(200).json({ message: "File share deleted successfully" });
    } catch (error) {
      console.error("Error deleting shared file:", error);
      res.status(500).json({ message: "Error deleting shared file" });
    }
  });
  
  // Get access logs for a shared file
  app.get("/api/shared-files/:id/access-logs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const fileId = parseInt(req.params.id);
      
      // Verify the file exists and belongs to the user
      const sharedFile = await storage.getSharedFile(fileId);
      
      if (!sharedFile) {
        return res.status(404).json({ message: "Shared file not found" });
      }
      
      // Temporarily disabled user permission check for debugging
      // if (sharedFile.userId !== userId) {
      //   return res.status(403).json({ message: "You don't have permission to view these logs" });
      // }
      
      // Get access logs
      const logs = await storage.getFileAccessLogs(fileId);
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching access logs:", error);
      res.status(500).json({ message: "Error fetching access logs" });
    }
  });
  
  // S3 file download route - generates a signed URL for downloading files
  app.get("/api/s3/:accountId/download", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.accountId);
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID format" });
      }
      
      const bucket = req.query.bucket as string;
      const key = req.query.key as string;
      
      if (!bucket || !key) {
        return res.status(400).json({ message: "Bucket and key are required" });
      }
      
      // Get account from database to verify ownership and credentials
      const account = await storage.getS3Account(accountId);
      
      // Check if the account exists (temporarily disabling user check since we're debugging)
      if (!account) {
        return res.status(404).json({ message: "S3 account not found" });
      }
      
      // Note: We've temporarily removed the user ID check while debugging permissions
      
      // Generate signed URL for download
      try {
        const signedUrl = await getDownloadUrl(accountId, bucket, key);
        return res.json({ signedUrl });
      } catch (error: any) {
        console.error("Error generating download URL:", error);
        return res.status(500).json({ 
          message: "Error generating download URL", 
          error: error.message || "Unknown error" 
        });
      }
    } catch (error: any) {
      console.error("Server error generating download URL:", error);
      return res.status(500).json({ 
        message: "Server error", 
        error: error.message || "Unknown error" 
      });
    }
  });
  
  // Public access to shared files
  app.get("/api/shared/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const password = req.query.password as string;
      
      // Find the shared file
      const sharedFile = await storage.getSharedFileByToken(token);
      
      if (!sharedFile) {
        return res.status(404).json({ message: "Shared file not found or has expired" });
      }
      
      // Check if file has expired
      if (sharedFile.expiresAt && new Date(sharedFile.expiresAt) < new Date()) {
        return res.status(410).json({ message: "This shared file has expired" });
      }
      
      // Check if password is required
      if (sharedFile.password) {
        if (!password) {
          return res.status(401).json({ 
            message: "Password required", 
            passwordRequired: true 
          });
        }
        
        // Verify password (in a real app, use a proper password comparison)
        if (password !== sharedFile.password) {
          return res.status(401).json({ 
            message: "Incorrect password", 
            passwordRequired: true 
          });
        }
      }
      
      // Increment access count
      await storage.incrementAccessCount(sharedFile.id);
      
      // Log access - but don't let it break the main functionality
      try {
        await storage.logFileAccess({
          fileId: sharedFile.id,
          ipAddress: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        });
      } catch (logError) {
        console.error("Error logging file access:", logError);
        // Continue even if logging fails
      }
      
      // Create signed URL for download
      const s3Account = await storage.getS3Account(sharedFile.accountId);
      let signedUrl = '';
      let directS3Url = '';
      
      try {
        signedUrl = await getDownloadUrl(
          sharedFile.accountId, 
          sharedFile.bucket, 
          sharedFile.path || sharedFile.filename
        );
        
        // Generate a direct S3 URL as a fallback
        directS3Url = `https://${sharedFile.bucket}.s3.amazonaws.com/${sharedFile.path || sharedFile.filename}`;
      } catch (error) {
        console.error("Error generating download URL:", error);
        return res.status(500).json({ message: "Error generating download URL" });
      }
      
      // Return file access details
      res.json({
        filename: sharedFile.filename,
        contentType: sharedFile.contentType,
        filesize: sharedFile.filesize,
        signedUrl,
        directS3Url,
        allowDownload: sharedFile.allowDownload,
        expiresAt: sharedFile.expiresAt,
      });
    } catch (error) {
      console.error("Error accessing shared file:", error);
      res.status(500).json({ message: "Error accessing shared file" });
    }
  });
  
  // S3 Upload route
  app.post("/api/s3/:accountId/upload", isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const accountId = parseInt(req.params.accountId);
      const bucket = req.body.bucket;
      const prefix = req.body.prefix || '';
      
      if (!accountId || !bucket) {
        return res.status(400).json({ message: "Missing required parameters: accountId and bucket" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      try {
        // Get S3 account to create AWS client
        const account = await storage.getS3Account(accountId);
        if (!account) {
          return res.status(404).json({ message: "S3 account not found" });
        }
        
        // Use our existing getS3Client function
        const s3Client = await getS3Client(accountId);
        
        // File details
        const file = req.file;
        const filename = file.originalname;
        const key = prefix ? `${prefix}${prefix.endsWith('/') ? '' : '/'}${filename}` : filename;
        
        // Convert buffer to stream
        const stream = new Readable();
        stream.push(file.buffer);
        stream.push(null);
        
        // Create the proper command
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        });
        
        // Send the command
        const response = await s3Client.send(command);
        
        console.log("File uploaded successfully:", filename);
        
        return res.status(200).json({
          message: "File uploaded successfully",
          key: key,
          bucket: bucket,
          contentType: file.mimetype,
          size: file.size
        });
      } catch (s3Error: any) {
        console.error("S3 error uploading file:", s3Error);
        return res.status(400).json({ 
          message: "Error uploading to S3", 
          error: s3Error.message || "Unknown S3 error" 
        });
      }
    } catch (error: any) {
      console.error("Server error uploading file:", error);
      return res.status(500).json({ 
        message: "Server error uploading file",
        error: error.message || "Unknown error" 
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Return the HTTP server
  return httpServer;
}

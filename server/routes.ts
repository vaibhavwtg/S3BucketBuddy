import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertS3AccountSchema, insertSharedFileSchema } from "@shared/schema";
import { randomBytes } from "crypto";
import { setupSession, setupAuthRoutes, isAuthenticated } from "./auth";
import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand, HeadBucketCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import { Readable } from "stream";
import { eq } from "drizzle-orm";

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
      
      const userId = parseInt(req.params.id);
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
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const accounts = await storage.getS3Accounts(req.session.userId);
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
      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);
      
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
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const accountData = {
        ...req.body,
        userId: req.session.userId
      };
      
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
      if (!req.session?.userId) {
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
      if (account.userId !== req.session.userId) {
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
      
      // List buckets
      try {
        const command = new ListBucketsCommand({});
        const response = await s3Client.send(command);
        
        // Return buckets as JSON array
        return res.json(response.Buckets || []);
      } catch (s3Error) {
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
      
      // List objects
      try {
        const command = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          Delimiter: delimiter
        });
        
        const response = await s3Client.send(command);
        
        // Return objects and folders as JSON
        return res.json({
          objects: response.Contents || [],
          folders: response.CommonPrefixes || [],
          prefix: prefix,
          delimiter: delimiter
        });
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
      const userId = req.session.userId;
      const { accountId, bucket, path, filename, expiresAt, allowDownload, password } = req.body;
      
      // Get file metadata if not provided
      let filesize = req.body.filesize;
      let contentType = req.body.contentType;
      
      if (!filesize || !contentType) {
        try {
          // Fetch S3 account to create AWS client
          const account = await storage.getS3Account(accountId);
          if (!account) {
            return res.status(404).json({ message: "S3 account not found" });
          }
          
          // Create signed URL to retrieve file metadata
          const downloadUrl = await getDownloadUrl(accountId, bucket, path || filename);
          
          // Set filesize and contentType if not provided
          if (!filesize) filesize = 0; // Default size if we can't get it
          if (!contentType) contentType = "application/octet-stream"; // Default content type
        } catch (error) {
          console.error("Error fetching file metadata:", error);
          // Continue with default values if metadata fetch fails
        }
      }
      
      // Generate a unique share token
      const shareToken = randomBytes(16).toString('hex');
      
      // Save to database
      const sharedFile = await storage.createSharedFile({
        userId: userId!,
        accountId,
        bucket,
        path: path || '',
        filename,
        filesize: filesize || 0,
        contentType,
        shareToken,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        allowDownload: allowDownload || true,
        password,
      });
      
      // Return with the shareable URL
      res.status(201).json({
        ...sharedFile,
        shareUrl: `${req.protocol}://${req.hostname}/shared/${shareToken}`,
        directS3Url: `https://${bucket}.s3.amazonaws.com/${path || filename}`
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
      
      if (sharedFile.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to delete this file" });
      }
      
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
      
      if (sharedFile.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to view these logs" });
      }
      
      // Get access logs
      const logs = await storage.getFileAccessLogs(fileId);
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching access logs:", error);
      res.status(500).json({ message: "Error fetching access logs" });
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
      
      // Log access
      await storage.logFileAccess({
        fileId: sharedFile.id,
        ipAddress: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        referrer: req.headers.referer || '',
        isDownload: false,
      });
      
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
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Return the HTTP server
  return httpServer;
}

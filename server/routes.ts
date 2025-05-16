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
      const accountId = parseInt(req.params.accountId);
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      const account = await storage.getS3Account(accountId);
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
      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);
      
      res.json(response.Buckets || []);
    } catch (error) {
      console.error("Error listing buckets:", error);
      res.status(500).json({ message: "Error listing buckets" });
    }
  });
  
  app.get("/api/s3/:accountId/objects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.accountId);
      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }
      
      const bucket = req.query.bucket as string;
      if (!bucket) {
        return res.status(400).json({ message: "Bucket name is required" });
      }
      
      const prefix = (req.query.prefix as string) || '';
      const delimiter = (req.query.delimiter as string) || '/';
      
      const account = await storage.getS3Account(accountId);
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
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: delimiter
      });
      
      const response = await s3Client.send(command);
      
      res.json({
        objects: response.Contents || [],
        folders: response.CommonPrefixes || [],
        prefix: prefix,
        delimiter: delimiter
      });
    } catch (error) {
      console.error("Error listing objects:", error);
      res.status(500).json({ message: "Error listing objects" });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Return the HTTP server
  return httpServer;
}

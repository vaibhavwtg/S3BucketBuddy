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
  app.get("/api/accounts", isAuthenticated, async (req: Request, res: Response) => {
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

  app.post("/api/accounts", isAuthenticated, async (req: Request, res: Response) => {
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
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Return the HTTP server
  return httpServer;
}

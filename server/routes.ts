import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertS3AccountSchema, insertSharedFileSchema } from "@shared/schema";
import { randomBytes } from "crypto";
import { setupAuth, isAuthenticated } from "./replitAuth";
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
  const httpServer = createServer(app);
  
  // Setup Replit Auth
  await setupAuth(app);
  
  // Authentication Routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Configure multer for file uploads
  const upload = multer({ storage: multer.memoryStorage() });
  
  // Return the HTTP server
  return httpServer;
}

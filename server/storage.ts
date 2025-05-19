import { 
  users, type User, type InsertUser, type UpsertUser,
  s3Accounts, type S3Account, type InsertS3Account,
  sharedFiles, type SharedFile, type InsertSharedFile,
  userSettings, type UserSettings, type InsertUserSettings,
  fileAccessLogs, type FileAccessLog, type InsertFileAccessLog,
  sessions
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, isNull, gt, desc, asc, or } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: number | string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number | string, data: Partial<User>): Promise<User | undefined>;
  
  // S3 Account operations
  getS3Accounts(userId: number | string): Promise<S3Account[]>;
  getS3Account(id: number): Promise<S3Account | undefined>;
  createS3Account(account: InsertS3Account): Promise<S3Account>;
  updateS3Account(id: number, account: Partial<S3Account>): Promise<S3Account | undefined>;
  deleteS3Account(id: number): Promise<boolean>;
  
  // Shared files operations
  getSharedFiles(userId: number | string): Promise<SharedFile[]>;
  getSharedFile(id: number): Promise<SharedFile | undefined>;
  getSharedFileByToken(token: string): Promise<SharedFile | undefined>;
  createSharedFile(file: InsertSharedFile): Promise<SharedFile>;
  updateSharedFile(id: number, file: Partial<SharedFile>): Promise<SharedFile | undefined>;
  deleteSharedFile(id: number): Promise<boolean>;
  incrementAccessCount(fileId: number): Promise<void>;
  
  // File access logs operations
  getFileAccessLogs(fileId: number): Promise<FileAccessLog[]>;
  logFileAccess(log: InsertFileAccessLog): Promise<FileAccessLog>;
  
  // User settings operations
  getUserSettings(userId: number | string): Promise<UserSettings | undefined>;
  createOrUpdateUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateLastAccessed(userId: number | string, path: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number | string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id.toString()));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }



  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }
  
  async updateUser(id: number | string, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id.toString()))
      .returning();
    return updatedUser;
  }

  // S3 Account operations
  async getS3Accounts(userId: number | string): Promise<S3Account[]> {
    // S3 accounts now use string user IDs, no need to convert
    return db.select().from(s3Accounts).where(eq(s3Accounts.userId, userId));
  }

  async getS3Account(id: number): Promise<S3Account | undefined> {
    const [account] = await db.select().from(s3Accounts).where(eq(s3Accounts.id, id));
    return account;
  }

  async createS3Account(account: InsertS3Account): Promise<S3Account> {
    const [newAccount] = await db.insert(s3Accounts).values(account).returning();
    return newAccount;
  }

  async updateS3Account(id: number, account: Partial<S3Account>): Promise<S3Account | undefined> {
    const [updatedAccount] = await db
      .update(s3Accounts)
      .set(account)
      .where(eq(s3Accounts.id, id))
      .returning();
    return updatedAccount;
  }

  async deleteS3Account(id: number): Promise<boolean> {
    const [deletedAccount] = await db
      .delete(s3Accounts)
      .where(eq(s3Accounts.id, id))
      .returning({ id: s3Accounts.id });
    return !!deletedAccount;
  }

  // Shared files operations
  async getSharedFiles(userId: number | string): Promise<SharedFile[]> {
    return db
      .select()
      .from(sharedFiles)
      .where(eq(sharedFiles.userId, userId))
      .orderBy(desc(sharedFiles.createdAt));
  }
  
  // Check if a file is already shared
  async getExistingSharedFile(userId: number | string, accountId: number, bucket: string, path: string): Promise<SharedFile | undefined> {
    const [file] = await db
      .select()
      .from(sharedFiles)
      .where(
        and(
          eq(sharedFiles.userId, userId),
          eq(sharedFiles.accountId, accountId),
          eq(sharedFiles.bucket, bucket),
          eq(sharedFiles.path, path)
        )
      );
    return file;
  }

  async getSharedFile(id: number): Promise<SharedFile | undefined> {
    const [file] = await db.select().from(sharedFiles).where(eq(sharedFiles.id, id));
    return file;
  }

  async getSharedFileByToken(token: string): Promise<SharedFile | undefined> {
    const now = new Date();
    const [file] = await db
      .select()
      .from(sharedFiles)
      .where(
        and(
          eq(sharedFiles.shareToken, token),
          // check if expiresAt is null or greater than now
          or(
            isNull(sharedFiles.expiresAt),
            gt(sharedFiles.expiresAt, now)
          )
        )
      );
    return file;
  }

  async createSharedFile(file: InsertSharedFile): Promise<SharedFile> {
    // Generate a random token if not provided
    if (!file.shareToken) {
      file.shareToken = randomBytes(16).toString('hex');
    }
    
    const [newFile] = await db.insert(sharedFiles).values(file).returning();
    return newFile;
  }

  async updateSharedFile(id: number, file: Partial<SharedFile>): Promise<SharedFile | undefined> {
    const [updatedFile] = await db
      .update(sharedFiles)
      .set(file)
      .where(eq(sharedFiles.id, id))
      .returning();
    return updatedFile;
  }

  async deleteSharedFile(id: number): Promise<boolean> {
    const [deletedFile] = await db
      .delete(sharedFiles)
      .where(eq(sharedFiles.id, id))
      .returning({ id: sharedFiles.id });
    return !!deletedFile;
  }

  // User settings operations
  async getUserSettings(userId: number | string): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId.toString()));
    return settings;
  }

  async createOrUpdateUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    // Convert userId to string to match database
    settings.userId = settings.userId.toString();
    
    // Check if settings already exist
    const existingSettings = await this.getUserSettings(settings.userId);
    
    // Handle lastAccessed array properly for PostgreSQL
    let settingsToSave = {
      ...settings
    };
    
    // Special handling for array fields to fix PostgreSQL issues
    
    // Remove lastAccessed from the settings to save to avoid malformed array issues
    if ('lastAccessed' in settingsToSave) {
      delete settingsToSave.lastAccessed;
    }
    
    // If we're only updating viewMode, make a clean object with just that property
    if (settings.viewMode && Object.keys(settings).length === 2) { // userId + viewMode
      settingsToSave = {
        userId: settings.userId,
        viewMode: settings.viewMode
      };
    }
    
    if (existingSettings) {
      const [updated] = await db
        .update(userSettings)
        .set(settingsToSave)
        .where(eq(userSettings.userId, settings.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userSettings)
        .values(settingsToSave)
        .returning();
      return created;
    }
  }

  async updateLastAccessed(userId: number, path: string): Promise<void> {
    try {
      // Get current settings
      const settings = await this.getUserSettings(userId);
      
      if (settings) {
        // Add the path to the beginning of the array and limit to 10 items
        let lastAccessed = Array.isArray(settings.lastAccessed) ? [...settings.lastAccessed] : [];
        
        // Remove if already exists
        lastAccessed = lastAccessed.filter(p => p !== path);
        
        // Add to beginning
        lastAccessed.unshift(path);
        
        // Limit to 10
        if (lastAccessed.length > 10) {
          lastAccessed = lastAccessed.slice(0, 10);
        }
        
        // Don't update if the array is empty
        if (lastAccessed.length > 0) {
          // Update with properly typed lastAccessed array
          await db
            .update(userSettings)
            .set({ lastAccessed })
            .where(eq(userSettings.userId, userId));
        }
      }
    } catch (error) {
      console.error("Error updating last accessed:", error);
    }
  }
  
  // File access tracking methods
  async incrementAccessCount(fileId: number): Promise<void> {
    try {
      // Use raw pool query to avoid Drizzle-related issues
      const query = `
        UPDATE shared_files 
        SET access_count = COALESCE(access_count, 0) + 1
        WHERE id = $1
      `;
      
      await pool.query(query, [fileId]);
    } catch (error) {
      console.error("Error incrementing access count:", error);
    }
  }
  
  async getFileAccessLogs(fileId: number): Promise<FileAccessLog[]> {
    return await db
      .select()
      .from(fileAccessLogs)
      .where(eq(fileAccessLogs.fileId, fileId))
      .orderBy(desc(fileAccessLogs.accessedAt));
  }
  
  async logFileAccess(log: InsertFileAccessLog): Promise<FileAccessLog> {
    const [accessLog] = await db
      .insert(fileAccessLogs)
      .values(log)
      .returning();
    
    // Increment the access count on the shared file
    await this.incrementAccessCount(log.fileId);
    
    return accessLog;
  }
}

export const storage = new DatabaseStorage();

import { 
  users, type User, type InsertUser,
  s3Accounts, type S3Account, type InsertS3Account,
  sharedFiles, type SharedFile, type InsertSharedFile,
  userSettings, type UserSettings, type InsertUserSettings,
  fileAccessLogs, type FileAccessLog, type InsertFileAccessLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, gt, desc, asc, or } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByProviderAuth(provider: string, providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // S3 Account operations
  getS3Accounts(userId: number): Promise<S3Account[]>;
  getS3Account(id: number): Promise<S3Account | undefined>;
  createS3Account(account: InsertS3Account): Promise<S3Account>;
  updateS3Account(id: number, account: Partial<S3Account>): Promise<S3Account | undefined>;
  deleteS3Account(id: number): Promise<boolean>;
  
  // Shared files operations
  getSharedFiles(userId: number): Promise<SharedFile[]>;
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
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createOrUpdateUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateLastAccessed(userId: number, path: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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

  async getUserByProviderAuth(provider: string, providerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.authProvider, provider),
        eq(users.authProviderId, providerId)
      )
    );
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // S3 Account operations
  async getS3Accounts(userId: number): Promise<S3Account[]> {
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
  async getSharedFiles(userId: number): Promise<SharedFile[]> {
    return db
      .select()
      .from(sharedFiles)
      .where(eq(sharedFiles.userId, userId))
      .orderBy(desc(sharedFiles.createdAt));
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
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings;
  }

  async createOrUpdateUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    // Check if settings already exist
    const existingSettings = await this.getUserSettings(settings.userId);
    
    // Ensure lastAccessed is properly typed as string[]
    const settingsToSave = {
      ...settings,
      // Set a default empty array if lastAccessed is undefined or not an array
      lastAccessed: Array.isArray(settings.lastAccessed) ? settings.lastAccessed : []
    };
    
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
    // Get current settings
    const settings = await this.getUserSettings(userId);
    
    if (settings) {
      // Add the path to the beginning of the array and limit to 10 items
      let lastAccessed = settings.lastAccessed || [];
      
      // Remove if already exists
      lastAccessed = lastAccessed.filter(p => p !== path);
      
      // Add to beginning
      lastAccessed.unshift(path);
      
      // Limit to 10
      if (lastAccessed.length > 10) {
        lastAccessed = lastAccessed.slice(0, 10);
      }
      
      // Update with properly typed lastAccessed array
      await db
        .update(userSettings)
        .set({ lastAccessed: lastAccessed as string[] })
        .where(eq(userSettings.userId, userId));
    }
  }
}

export const storage = new DatabaseStorage();

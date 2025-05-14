import { 
  users, type User, type InsertUser, type UpsertUser,
  s3Accounts, type S3Account, type InsertS3Account,
  sharedFiles, type SharedFile, type InsertSharedFile,
  userSettings, type UserSettings, type InsertUserSettings,
  fileAccessLogs, type FileAccessLog, type InsertFileAccessLog
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, isNull, gt, desc, asc, or } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  
  // Authentication methods
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // S3 Account operations
  getS3Accounts(userId: string): Promise<S3Account[]>;
  getS3Account(id: number): Promise<S3Account | undefined>;
  createS3Account(account: InsertS3Account): Promise<S3Account>;
  updateS3Account(id: number, account: Partial<S3Account>): Promise<S3Account | undefined>;
  deleteS3Account(id: number): Promise<boolean>;
  
  // Shared files operations
  getSharedFiles(userId: string): Promise<SharedFile[]>;
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
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  createOrUpdateUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateLastAccessed(userId: string, path: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!username) {
      return undefined;
    }
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    // Generate a unique ID if not provided
    const userId = userData.id || `local_${randomBytes(8).toString('hex')}`;
    
    // Insert user with properly typed values (matches SQL schema)
    const [newUser] = await db.insert(users).values({
      id: userId,
      email: userData.email || null,
      username: userData.username || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      password: userData.password || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return newUser;
  }
  
  async upsertUser(userData: UpsertUser): Promise<User> {
    // Ensure we have an ID
    const userId = userData.id || `local_${randomBytes(8).toString('hex')}`;
    
    // Insert user with properly typed values (matches SQL schema)
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email: userData.email || null,
        username: userData.username || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        password: userData.password || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email || null,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: userData.profileImageUrl || null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // S3 Account operations
  async getS3Accounts(userId: string): Promise<S3Account[]> {
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
  async getSharedFiles(userId: string): Promise<SharedFile[]> {
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
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings;
  }

  async createOrUpdateUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    try {
      // Check if settings already exist
      const existingSettings = await this.getUserSettings(settings.userId);
      
      // We'll omit lastAccessed to avoid array handling issues in PostgreSQL
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { lastAccessed, ...otherSettings } = settings;
      
      if (existingSettings) {
        const [updated] = await db
          .update(userSettings)
          .set({
            userId: otherSettings.userId,
            theme: otherSettings.theme || 'light',
            defaultAccountId: otherSettings.defaultAccountId,
            notifications: otherSettings.notifications !== undefined ? otherSettings.notifications : true
          })
          .where(eq(userSettings.userId, settings.userId))
          .returning();
        return updated;
      } else {
        const [created] = await db
          .insert(userSettings)
          .values({
            userId: otherSettings.userId,
            theme: otherSettings.theme || 'light',
            defaultAccountId: otherSettings.defaultAccountId,
            notifications: otherSettings.notifications !== undefined ? otherSettings.notifications : true,
            // Explicitly set an empty array in database-compatible format
            lastAccessed: []
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error("Error in createOrUpdateUserSettings:", error);
      throw error;
    }
  }

  async updateLastAccessed(userId: string, path: string): Promise<void> {
    try {
      // For now, we'll skip updating lastAccessed to avoid PostgreSQL array issues
      // We'll just make sure the user has settings
      const settings = await this.getUserSettings(userId);
      
      if (!settings) {
        // Create settings if they don't exist
        await this.createOrUpdateUserSettings({
          userId,
          theme: 'light',
          notifications: true
        });
      }
      
      // We'll eventually implement this feature with a proper array solution
      // For now, we're avoiding array operations to prevent database errors
    } catch (error) {
      console.error("Error in updateLastAccessed:", error);
      // Don't throw - this is a non-critical operation
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

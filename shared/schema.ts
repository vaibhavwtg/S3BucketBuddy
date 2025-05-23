import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - simple email/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: text("email").unique().notNull(),
  username: varchar("username", { length: 100 }).unique().notNull(),
  password: text("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const s3Accounts = pgTable("s3_accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  accessKeyId: text("access_key_id").notNull(),
  secretAccessKey: text("secret_access_key").notNull(),
  region: text("region").notNull(),
  defaultBucket: text("default_bucket"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sharedFiles = pgTable("shared_files", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  accountId: integer("account_id").notNull().references(() => s3Accounts.id),
  bucket: text("bucket").notNull(),
  path: text("path").notNull(),
  filename: text("filename").notNull(),
  filesize: integer("filesize").notNull(),
  contentType: text("content_type"),
  shareToken: text("share_token").notNull().unique(),
  expiresAt: timestamp("expires_at"),
  allowDownload: boolean("allow_download").default(true),
  password: text("password"),
  accessCount: integer("access_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table to track access/audit history for shared files
export const fileAccessLogs = pgTable("file_access_logs", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => sharedFiles.id),
  accessedAt: timestamp("accessed_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (table) => {
  return {
    fileIdIdx: index("file_access_logs_file_id_idx").on(table.fileId),
    accessedAtIdx: index("file_access_logs_accessed_at_idx").on(table.accessedAt),
  };
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 100 }).notNull(),
  theme: text("theme").default("light"),
  defaultAccountId: integer("default_account_id").references(() => s3Accounts.id),
  notifications: boolean("notifications").default(true),
  viewMode: text("view_mode").default("grid"),
  lastAccessed: jsonb("last_accessed").$type<string[]>().default([]),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true, 
  updatedAt: true,
});

// Create a custom S3 account schema that includes an optional "auto" region
const baseS3AccountSchema = createInsertSchema(s3Accounts).omit({
  id: true,
  createdAt: true,
});

export const insertS3AccountSchema = baseS3AccountSchema.extend({
  region: z.string().min(1, "Region is required"),
  selectedBucket: z.string().optional(),
});

export const insertSharedFileSchema = createInsertSchema(sharedFiles).omit({
  id: true,
  createdAt: true,
  accessCount: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
});

export const insertFileAccessLogSchema = createInsertSchema(fileAccessLogs)
  .omit({
    id: true,
    accessedAt: true,
  })
  .partial({
    country: true,
    city: true,
    referrer: true,
  });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertS3Account = z.infer<typeof insertS3AccountSchema>;
export type S3Account = typeof s3Accounts.$inferSelect;

export type InsertSharedFile = z.infer<typeof insertSharedFileSchema>;
export type SharedFile = typeof sharedFiles.$inferSelect;

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

export type InsertFileAccessLog = z.infer<typeof insertFileAccessLogSchema>;
export type FileAccessLog = typeof fileAccessLogs.$inferSelect;

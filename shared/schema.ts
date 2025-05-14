import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  avatarUrl: text("avatar_url"),
  authProvider: text("auth_provider"), // 'google', 'apple', 'microsoft', 'email'
  authProviderId: text("auth_provider_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const s3Accounts = pgTable("s3_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
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
  userId: integer("user_id").notNull().references(() => users.id),
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
  ipAddress: varchar("ip_address", { length: 45 }), // IPv6 can be up to 45 chars
  userAgent: text("user_agent"),
  country: varchar("country", { length: 2 }),
  city: varchar("city", { length: 100 }),
  referrer: text("referrer"),
  isDownload: boolean("is_download").default(false),
}, (table) => {
  return {
    fileIdIdx: index("file_access_logs_file_id_idx").on(table.fileId),
    accessedAtIdx: index("file_access_logs_accessed_at_idx").on(table.accessedAt),
  };
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  theme: text("theme").default("light"),
  defaultAccountId: integer("default_account_id").references(() => s3Accounts.id),
  notifications: boolean("notifications").default(true),
  lastAccessed: jsonb("last_accessed").$type<string[]>().default([]),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
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

export const insertFileAccessLogSchema = createInsertSchema(fileAccessLogs).omit({
  id: true,
  accessedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertS3Account = z.infer<typeof insertS3AccountSchema>;
export type S3Account = typeof s3Accounts.$inferSelect;

export type InsertSharedFile = z.infer<typeof insertSharedFileSchema>;
export type SharedFile = typeof sharedFiles.$inferSelect;

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

export type InsertFileAccessLog = z.infer<typeof insertFileAccessLogSchema>;
export type FileAccessLog = typeof fileAccessLogs.$inferSelect;

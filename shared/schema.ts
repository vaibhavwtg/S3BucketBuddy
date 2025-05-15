import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index, primaryKey, pgEnum, unique } from "drizzle-orm/pg-core";
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

// Users table - supporting both traditional auth and social login
// User roles enum
export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'suspended']);

// Subscription plan enum
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['free', 'basic', 'premium', 'business']);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: text("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Add password field for traditional auth
  username: text("username"),
  password: text("password"),
  role: userRoleEnum("role").default("user").notNull(),
  isVerified: boolean("is_verified").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan").default("free"),
  createdAt: timestamp("created_at").defaultNow(),
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

// Permission level enum for shared files
export const permissionLevelEnum = pgEnum('permission_level', [
  'view', // View-only access
  'download', // Can download
  'edit', // Can edit metadata
  'comment', // Can add comments
  'full', // Full access except delete
  'owner' // Owner access with delete permissions
]);

// Create access type enum for shared files
export const accessTypeEnum = pgEnum('access_type', [
  'public', // Anyone with the link
  'domain', // Anyone with specific email domain
  'email', // Specific email addresses only
  'password' // Password protected
]);

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
  // New field: For manually expiring links regardless of expiration date
  isExpired: boolean("is_expired").default(false),
  // New field: Whether to allow public/direct S3 access for embedding
  isPublic: boolean("is_public").default(false),
  // New advanced permission fields
  permissionLevel: permissionLevelEnum("permission_level").default('view'),
  accessType: accessTypeEnum("access_type").default('public'),
  allowedDomains: text("allowed_domains").array(), // For domain-restricted access
  maxDownloads: integer("max_downloads"), // Limit number of downloads
  notifyOnAccess: boolean("notify_on_access").default(false), // Notify owner when accessed
  watermarkEnabled: boolean("watermark_enabled").default(false), // Apply watermark to previews
  password: text("password"),
  accessCount: integer("access_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Table for specific recipients of shared files
export const fileRecipients = pgTable("file_recipients", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => sharedFiles.id, { onDelete: 'cascade' }),
  email: text("email").notNull(),
  permissionLevel: permissionLevelEnum("permission_level").default('view'),
  notified: boolean("notified").default(false),
  accessCount: integer("access_count").default(0),
  lastAccessed: timestamp("last_accessed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Unique constraint to prevent duplicate recipients for the same file
    uniqueEmailPerFile: unique("unique_email_per_file").on(table.fileId, table.email),
    emailIdx: index("file_recipients_email_idx").on(table.email),
  };
});

// Table to track access/audit history for shared files
export const fileAccessLogs = pgTable("file_access_logs", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => sharedFiles.id),
  accessedAt: timestamp("accessed_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 45 }), // IPv6 can be up to 45 chars
  userAgent: text("user_agent"),
  // Removed country and city fields that were causing schema errors
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
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  theme: text("theme").default("light"),
  accentColor: text("accent_color").default("#8BD3D6"), // Default teal color
  defaultAccountId: integer("default_account_id").references(() => s3Accounts.id),
  notifications: boolean("notifications").default(true),
  lastAccessed: text("last_accessed").array().default([]),
});

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  priceMonthly: integer("price_monthly").notNull(), // in cents
  priceYearly: integer("price_yearly").notNull(), // in cents
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdYearly: text("stripe_price_id_yearly"),
  features: jsonb("features").default({}).notNull(),
  maxAccounts: integer("max_accounts").notNull(),
  maxStorage: integer("max_storage").notNull(), // in GB
  maxBandwidth: integer("max_bandwidth").notNull(), // in GB
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Billing/invoice records
export const billingRecords = pgTable("billing_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  stripeInvoiceId: text("stripe_invoice_id"),
  amount: integer("amount").notNull(), // in cents
  status: text("status").default("pending").notNull(),
  billingDate: timestamp("billing_date").notNull(),
  paidDate: timestamp("paid_date"),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
}).partial({
  id: true,  // ID can be auto-generated
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true, 
  updatedAt: true,
}).partial({
  username: true,
  password: true,
});

export type UpsertUser = z.infer<typeof upsertUserSchema>; 

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
  updatedAt: true,
  accessCount: true,
});

export const insertFileRecipientSchema = createInsertSchema(fileRecipients).omit({
  id: true,
  accessCount: true,
  lastAccessed: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
});

export const insertFileAccessLogSchema = createInsertSchema(fileAccessLogs).omit({
  id: true,
  accessedAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export const insertBillingRecordSchema = createInsertSchema(billingRecords).omit({
  id: true,
  createdAt: true,
});

// Usage stats table for tracking resource usage
export const usageStats = pgTable("usage_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  accountId: integer("account_id").references(() => s3Accounts.id),
  storageUsed: integer("storage_used").default(0), // in bytes
  bandwidthUsed: integer("bandwidth_used").default(0), // in bytes
  objectCount: integer("object_count").default(0),
  date: timestamp("date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUsageStatsSchema = createInsertSchema(usageStats).omit({
  id: true,
  createdAt: true,
});

// Admin action logs for auditing
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  targetUserId: varchar("target_user_id").references(() => users.id),
  action: text("action").notNull(),
  details: jsonb("details").default({}),
  ip: varchar("ip", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({
  id: true,
  createdAt: true,
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

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

export type InsertBillingRecord = z.infer<typeof insertBillingRecordSchema>;
export type BillingRecord = typeof billingRecords.$inferSelect;

export type InsertUsageStat = z.infer<typeof insertUsageStatsSchema>;
export type UsageStat = typeof usageStats.$inferSelect;

export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
export type AdminLog = typeof adminLogs.$inferSelect;

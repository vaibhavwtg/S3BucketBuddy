// AWS S3 Types
export interface S3Bucket {
  Name?: string;
  CreationDate?: Date;
}

export interface EnhancedS3Bucket extends S3Bucket {
  accountId: number;
  accountName: string;
  region: string;
}

export interface S3Object {
  Key?: string;
  LastModified?: Date;
  ETag?: string;
  Size?: number;
  StorageClass?: string;
  Owner?: {
    DisplayName?: string;
    ID?: string;
  };
}

export interface S3CommonPrefix {
  Prefix?: string;
}

export interface S3ListObjectsResult {
  objects: S3Object[];
  folders: S3CommonPrefix[];
  prefix: string;
  delimiter: string;
}

// App Types
export interface User {
  id: number;
  username: string;
  email: string;
  avatarUrl?: string;
}

export interface S3Account {
  id: number;
  userId: number;
  name: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  defaultBucket?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SharedFile {
  id: number;
  userId: number;
  accountId: number;
  bucket: string;
  path: string;
  filename: string;
  filesize: number;
  contentType?: string;
  shareToken: string;
  expiresAt?: string;
  allowDownload: boolean;
  password?: string;
  createdAt: string;
  shareUrl?: string;
  accessCount?: number;
}

export interface UserSettings {
  id: number;
  userId: number;
  theme: string;
  defaultAccountId?: number;
  notifications: boolean;
  lastAccessed: string[];
}

export interface SharedFileAccess {
  filename: string;
  contentType?: string;
  filesize: number;
  signedUrl: string;
  directS3Url?: string; // Add direct S3 URL 
  allowDownload: boolean;
  expiresAt?: string;
}

export interface FileUploadProgress {
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

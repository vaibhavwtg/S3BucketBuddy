import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand, CopyObjectCommand, HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storage } from "./storage";

// Cache S3 clients by account ID to avoid creating new ones for each request
const s3ClientCache = new Map<number, S3Client>();

// Export this function so it can be used in routes.ts
export async function getS3Client(accountId: number): Promise<S3Client> {
  // Check if we already have a client for this account
  if (s3ClientCache.has(accountId)) {
    return s3ClientCache.get(accountId)!;
  }
  
  // Fetch account info from database
  const account = await storage.getS3Account(accountId);
  if (!account) {
    throw new Error(`S3 account with ID ${accountId} not found`);
  }
  
  // Create new S3 client
  const client = new S3Client({
    region: account.region,
    credentials: {
      accessKeyId: account.accessKeyId,
      secretAccessKey: account.secretAccessKey,
    }
  });
  
  // Cache the client
  s3ClientCache.set(accountId, client);
  
  return client;
}

export async function listBuckets(accountId: number) {
  const s3 = await getS3Client(accountId);
  const command = new ListBucketsCommand({});
  const response = await s3.send(command);
  return response.Buckets || [];
}

export async function listObjects(accountId: number, bucket: string, prefix = "", delimiter = "/") {
  const s3 = await getS3Client(accountId);
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    Delimiter: delimiter,
  });
  
  const response = await s3.send(command);
  
  return {
    objects: response.Contents || [],
    folders: response.CommonPrefixes || [],
    prefix,
    delimiter,
  };
}

export async function getDownloadUrl(accountId: number, bucket: string, key: string, expiresIn = 3600) {
  const s3 = await getS3Client(accountId);
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  return await getSignedUrl(s3, command, { expiresIn });
}

export async function deleteObject(accountId: number, bucket: string, key: string) {
  const s3 = await getS3Client(accountId);
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  return await s3.send(command);
}

export async function deleteObjects(accountId: number, bucket: string, keys: string[]) {
  const s3 = await getS3Client(accountId);
  const command = new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: {
      Objects: keys.map(Key => ({ Key })),
      Quiet: true
    },
  });
  
  return await s3.send(command);
}

export async function copyObject(accountId: number, sourceBucket: string, sourceKey: string, destinationBucket: string, destinationKey: string) {
  const s3 = await getS3Client(accountId);
  const command = new CopyObjectCommand({
    Bucket: destinationBucket,
    Key: destinationKey,
    CopySource: `${sourceBucket}/${encodeURIComponent(sourceKey)}`,
  });
  
  return await s3.send(command);
}

export async function getObjectMetadata(accountId: number, bucket: string, key: string) {
  const s3 = await getS3Client(accountId);
  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  return await s3.send(command);
}

export async function checkBucketExists(accountId: number, bucket: string): Promise<boolean> {
  try {
    const s3 = await getS3Client(accountId);
    const command = new HeadBucketCommand({
      Bucket: bucket,
    });
    
    await s3.send(command);
    return true;
  } catch (error) {
    return false;
  }
}
import { S3Account, S3Bucket, S3ListObjectsResult, FileUploadProgress } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";

export async function listBuckets(accountId: number): Promise<S3Bucket[]> {
  const res = await apiRequest("GET", `/api/s3/${accountId}/buckets`);
  return await res.json();
}

export async function listObjects(
  accountId: number,
  bucket: string,
  prefix: string = "",
  delimiter: string = "/"
): Promise<S3ListObjectsResult> {
  const params = new URLSearchParams({
    bucket,
    ...(prefix && { prefix }),
    ...(delimiter && { delimiter }),
  });
  
  const res = await apiRequest("GET", `/api/s3/${accountId}/objects?${params.toString()}`);
  return await res.json();
}

export async function getDownloadUrl(
  accountId: number,
  bucket: string,
  key: string
): Promise<string> {
  const params = new URLSearchParams({
    bucket,
    key,
  });
  
  const res = await apiRequest("GET", `/api/s3/${accountId}/download?${params.toString()}`);
  const data = await res.json();
  return data.signedUrl;
}

export async function deleteObject(
  accountId: number,
  bucket: string,
  key: string
): Promise<void> {
  const params = new URLSearchParams({
    bucket,
    key,
  });
  
  await apiRequest("DELETE", `/api/s3/${accountId}/objects?${params.toString()}`);
}

export async function deleteObjects(
  accountId: number,
  bucket: string,
  keys: string[]
): Promise<{ deleted: string[]; errors: { key: string; message: string }[] }> {
  const response = await apiRequest("POST", `/api/s3/${accountId}/batch-delete`, {
    bucket,
    keys,
  });
  
  return await response.json();
}

export async function getDownloadUrlsForBatch(
  accountId: number,
  bucket: string,
  keys: string[]
): Promise<{ [key: string]: string }> {
  const response = await apiRequest("POST", `/api/s3/${accountId}/batch-download`, {
    bucket,
    keys,
  });
  
  return await response.json();
}

export async function copyObjects(
  accountId: number,
  sourceBucket: string,
  keys: string[],
  destinationBucket: string,
  destinationPrefix: string = ""
): Promise<{ copied: string[]; errors: { key: string; message: string }[] }> {
  const response = await apiRequest("POST", `/api/s3/${accountId}/batch-copy`, {
    sourceBucket,
    destinationBucket,
    destinationPrefix,
    keys,
  });
  
  return await response.json();
}

export async function moveObjects(
  accountId: number,
  sourceBucket: string,
  keys: string[],
  destinationBucket: string,
  destinationPrefix: string = ""
): Promise<{ moved: string[]; errors: { key: string; message: string }[] }> {
  const response = await apiRequest("POST", `/api/s3/${accountId}/batch-move`, {
    sourceBucket,
    destinationBucket,
    destinationPrefix,
    keys,
  });
  
  return await response.json();
}

export async function renameObject(
  accountId: number,
  bucket: string,
  sourceKey: string,
  newName: string
): Promise<{ newKey: string }> {
  const response = await apiRequest("POST", `/api/s3/${accountId}/rename`, {
    bucket,
    sourceKey,
    newName,
  });
  
  return await response.json();
}

export async function uploadFile(
  accountId: number,
  bucket: string,
  file: File,
  prefix: string = "",
  onProgress?: (progress: FileUploadProgress) => void
): Promise<{bucket: string, key: string, size: number, mimetype: string}> {
  console.log("Starting upload for accountId:", accountId, "to bucket:", bucket, "with file:", file.name);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", bucket);
  
  if (prefix) {
    formData.append("prefix", prefix);
  }
  
  // If we have a progress callback, use XMLHttpRequest for upload progress
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      console.log("Creating XMLHttpRequest for upload to account:", accountId);
      const uploadUrl = `/api/s3/${accountId.toString()}/upload`;
      console.log("Upload URL:", uploadUrl);
      
      xhr.open("POST", uploadUrl);
      xhr.withCredentials = true; // Important: Include credentials for session cookies
      
      // Don't set Content-Type header, browser will set it with proper boundary for FormData
      
      // Add event listener for cookies and authentication check
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 1) { // OPENED
          console.log("XHR connection opened", {
            withCredentials: xhr.withCredentials,
            url: uploadUrl
          });
        }
      };
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress({
            filename: file.name,
            progress,
            status: progress < 100 ? "uploading" : "completed",
          });
        }
      });
      
      xhr.addEventListener("load", () => {
        console.log("Upload response received, status:", xhr.status);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log("Upload successful response:", response);
            resolve(response);
          } catch (error) {
            console.error("Invalid response format:", xhr.responseText);
            reject(new Error("Invalid response format"));
          }
        } else {
          console.error("Upload failed with status:", xhr.status, xhr.statusText);
          console.error("Error response:", xhr.responseText);
          
          onProgress({
            filename: file.name,
            progress: 0,
            status: "error",
            error: `Upload failed: ${xhr.status} ${xhr.statusText}`,
          });
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });
      
      xhr.addEventListener("error", (event) => {
        console.error("Upload XHR error:", event);
        console.error("Upload URL:", `/api/s3/${accountId.toString()}/upload`);
        
        onProgress({
          filename: file.name,
          progress: 0,
          status: "error",
          error: "Network error during upload",
        });
        reject(new Error("Network error during upload"));
      });
      
      xhr.addEventListener("abort", () => {
        onProgress({
          filename: file.name,
          progress: 0,
          status: "error",
          error: "Upload aborted",
        });
        reject(new Error("Upload aborted"));
      });
      
      console.log("Sending upload request with formData:", {
        file: file.name,
        size: file.size,
        type: file.type,
        bucket,
        prefix
      });
      xhr.send(formData);
    });
  } else {
    // No progress callback, use fetch instead
    const uploadUrl = `/api/s3/${accountId.toString()}/upload`;
    console.log("Uploading with fetch to:", uploadUrl);
    
    try {
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        credentials: "include", // Important: Include credentials for session cookies
      });
      
      console.log("Upload response status:", res.status);
      
      if (!res.ok) {
        const text = await res.text();
        console.error("Upload failed:", res.status, text);
        throw new Error(`Upload failed: ${res.status} ${text}`);
      }
      
      const responseData = await res.json();
      console.log("Upload successful, response:", responseData);
      return responseData;
    } catch (error) {
      console.error("Error during fetch upload:", error);
      throw error;
    }
  }
}

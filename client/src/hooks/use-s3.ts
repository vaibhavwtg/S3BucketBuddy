import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  listBuckets, 
  listObjects, 
  deleteObject, 
  deleteObjects, 
  getDownloadUrl, 
  getDownloadUrlsForBatch, 
  uploadFile,
  copyObjects,
  moveObjects,
  renameObject
} from "@/lib/s3";
import { useToast } from "@/hooks/use-toast";
import { S3Bucket, S3Object, S3CommonPrefix, S3ListObjectsResult, FileUploadProgress, S3Account, EnhancedS3Bucket } from "@/lib/types";

/**
 * Hook for working with S3 buckets
 */
export function useS3Buckets(accountId: number | undefined) {
  const enabled = typeof accountId === 'number';
  const { toast } = useToast();
  
  return useQuery({
    queryKey: [`/api/s3/${accountId}/buckets`],
    queryFn: async () => {
      if (!accountId) {
        console.error("Invalid accountId for bucket listing:", accountId);
        return [];
      }
      
      try {
        console.log(`Fetching buckets for account ${accountId}`);
        const buckets = await listBuckets(accountId);
        console.log(`Successfully fetched ${buckets.length} buckets for account ${accountId}`);
        return buckets;
      } catch (error) {
        console.error(`Error fetching buckets for account ${accountId}:`, error);
        toast({
          title: "Failed to load buckets",
          description: error instanceof Error ? error.message : "Could not load buckets for this account",
          variant: "destructive",
        });
        throw error;
      }
    },
    enabled,
    retry: 2,
    refetchOnWindowFocus: false
  });
}

/**
 * Hook for fetching all buckets across all accounts
 * This is used to display buckets directly as folders
 */
export function useAllS3Buckets() {
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<S3Account[]>({
    queryKey: ['/api/s3-accounts'],
  });
  
  // Fetch buckets for all accounts
  const { toast } = useToast();
  const results = useQuery<EnhancedS3Bucket[]>({
    queryKey: ['all-buckets'],
    queryFn: async () => {
      // Add debug logging
      console.log('Fetching buckets for accounts:', accounts);
      
      if (!accounts || accounts.length === 0) {
        console.log('No accounts available for fetching buckets');
        return [];
      }
      
      // Fetch buckets for each account in parallel
      const bucketsPromises = accounts.map(async (account) => {
        if (!account || !account.id) {
          console.log('Invalid account detected:', account);
          return [];
        }
        
        try {
          console.log(`Fetching buckets for account ${account.id} (${account.name})`);
          const buckets = await listBuckets(account.id);
          console.log(`Retrieved ${buckets.length} buckets for account ${account.id}`);
          
          if (!buckets || buckets.length === 0) {
            console.log(`No buckets found for account ${account.id} (${account.name})`);
          }
          
          // Attach account info to each bucket and filter out invalid buckets
          return buckets
            .filter(bucket => bucket && bucket.Name) // Filter out invalid buckets
            .map(bucket => ({
              ...bucket,
              accountId: account.id,
              accountName: account.name,
              region: account.region,
            } as EnhancedS3Bucket));
        } catch (error) {
          console.error(`Error fetching buckets for account ${account.id}:`, error);
          toast({
            title: "Bucket Loading Issue",
            description: `Failed to load buckets for account ${account.name}`,
            variant: "destructive"
          });
          return [];
        }
      });
      
      try {
        const results = await Promise.all(bucketsPromises);
        
        // Flatten the results and log
        const flattenedResults = results.flat();
        console.log('All buckets data:', flattenedResults);
        
        if (flattenedResults.length === 0) {
          console.log('No buckets found across all accounts');
        }
        
        return flattenedResults;
      } catch (error) {
        console.error('Error loading buckets from accounts:', error);
        toast({
          title: "Failed to Load Buckets",
          description: "Could not retrieve your S3 buckets. Please try again.",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: accounts.length > 0,
    retry: 2,
    refetchOnWindowFocus: false
  });
  
  return {
    data: results.data || [],
    isLoading: results.isLoading || isLoadingAccounts,
    isError: results.isError,
    error: results.error,
  };
}

/**
 * Hook for listing objects in an S3 bucket
 */
export function useS3Objects(
  accountId: number | undefined,
  bucket: string | undefined,
  prefix: string = "",
  enabled = true
) {
  // Enhance type checking to ensure accountId is a number
  const validAccountId = typeof accountId === 'number' && !isNaN(accountId);
  
  // Enhanced validation for bucket - must be non-empty string
  const validBucket = typeof bucket === 'string' && bucket.trim() !== '';
  
  // Only enable the query if we have a valid account ID and bucket
  // This is a critical fix for file browsing functionality
  const isEnabled = enabled && validAccountId && validBucket;
  
  const { toast } = useToast();
  
  // Add detailed logging to help debug issues
  if (enabled && !isEnabled) {
    console.warn("S3Objects query disabled due to invalid params:", { 
      accountId, 
      validAccountId, 
      bucket, 
      validBucket 
    });
  }
  
  return useQuery<S3ListObjectsResult>({
    queryKey: [`/api/s3/${accountId}/objects`, bucket, prefix],
    queryFn: async () => {
      // Double-check parameters to prevent runtime errors
      if (!validAccountId || !validBucket) {
        console.error("Invalid parameters for S3 objects query:", { 
          accountId, 
          bucket, 
          prefix 
        });
        return { 
          objects: [], 
          folders: [], 
          prefix: prefix || '', 
          delimiter: '/' 
        };
      }
      
      try {
        console.log(`Fetching objects for account ${accountId}, bucket ${bucket}, prefix ${prefix || "(root)"}`);
        const result = await listObjects(accountId, bucket, prefix);
        console.log(`Fetched objects successfully: ${result.objects.length} files, ${result.folders.length} folders`);
        return result;
      } catch (error) {
        console.error("Error fetching objects:", error);
        toast({
          title: "Failed to load files",
          description: error instanceof Error ? error.message : "Could not load files from this bucket",
          variant: "destructive",
        });
        // Return empty result instead of throwing to prevent UI crashes
        return { 
          objects: [], 
          folders: [], 
          prefix: prefix || '', 
          delimiter: '/', 
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    },
    enabled: isEnabled,
    retry: 2, // Retry twice for S3 failures
    refetchOnWindowFocus: false // Avoid excessive requests
  });
}

/**
 * Hook for S3 file operations (delete, download)
 */
export function useS3FileOperations(accountId: number | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Record<string, FileUploadProgress>>({});

  // Single file deletion
  const deleteFileMutation = useMutation({
    mutationFn: async ({ bucket, key }: { bucket: string; key: string }) => {
      if (!accountId) throw new Error("Account ID is required");
      return deleteObject(accountId, bucket, key);
    },
    onSuccess: (_, variables) => {
      toast({
        title: "File deleted",
        description: "File has been deleted successfully",
      });
      
      // Invalidate the objects query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: [`/api/s3/${accountId}/objects`, variables.bucket] 
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      });
    },
  });
  
  // Single file download 
  const downloadFileMutation = useMutation({
    mutationFn: async ({ bucket, key }: { bucket: string; key: string }) => {
      if (!accountId) throw new Error("Account ID is required");
      
      const signedUrl = await getDownloadUrl(accountId, bucket, key);
      
      // Create a temporary link and click it to start the download
      const link = document.createElement("a");
      link.href = signedUrl;
      link.setAttribute("download", key.split("/").pop() || "download");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "Your file will download shortly",
      });
    },
    onError: (error) => {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to generate download link",
        variant: "destructive",
      });
    },
  });
  
  // Create a wrapper function for downloadFileMutation
  const downloadFile = async (bucket: string, key: string): Promise<void> => {
    try {
      await downloadFileMutation.mutateAsync({ bucket, key });
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  // Batch file download
  const downloadFiles = async (bucket: string, keys: string[]): Promise<void> => {
    if (!accountId) {
      toast({
        title: "Download failed",
        description: "Account ID is required",
        variant: "destructive",
      });
      return;
    }
    
    if (keys.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to download",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Preparing files",
      description: `Generating download links for ${keys.length} file(s)...`,
    });
    
    try {
      const urlMap = await getDownloadUrlsForBatch(accountId, bucket, keys);
      
      // Create download links sequentially to avoid browser blocking multiple downloads
      let delay = 0;
      const delayIncrement = 250; // milliseconds between downloads
      
      Object.entries(urlMap).forEach(([key, url], index) => {
        setTimeout(() => {
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", key.split("/").pop() || `file-${index}`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, delay);
        
        delay += delayIncrement;
      });
      
      toast({
        title: "Downloads started",
        description: `${Object.keys(urlMap).length} file(s) will download shortly`,
      });
    } catch (error) {
      toast({
        title: "Batch download failed",
        description: error instanceof Error ? error.message : "Failed to generate download links",
        variant: "destructive",
      });
    }
  };
  
  // Batch file deletion
  const batchDeleteMutation = useMutation({
    mutationFn: async ({ bucket, keys }: { bucket: string; keys: string[] }) => {
      if (!accountId) throw new Error("Account ID is required");
      return deleteObjects(accountId, bucket, keys);
    },
    onSuccess: (result, variables) => {
      const { deleted, errors } = result;
      
      if (errors.length === 0) {
        toast({
          title: "Batch delete successful",
          description: `Successfully deleted ${deleted.length} file(s)`,
        });
      } else if (deleted.length > 0) {
        toast({
          title: "Partial batch delete",
          description: `Deleted ${deleted.length} file(s), but ${errors.length} file(s) failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Batch delete failed",
          description: "Failed to delete any files",
          variant: "destructive",
        });
      }
      
      // Invalidate the objects query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: [`/api/s3/${accountId}/objects`, variables.bucket] 
      });
    },
    onError: (error) => {
      toast({
        title: "Batch delete failed",
        description: error instanceof Error ? error.message : "Failed to delete files",
        variant: "destructive",
      });
    },
  });

  // Batch copy operation
  const batchCopyMutation = useMutation({
    mutationFn: async ({ 
      sourceBucket, 
      keys, 
      destinationBucket, 
      destinationPrefix = "" 
    }: { 
      sourceBucket: string; 
      keys: string[]; 
      destinationBucket: string;
      destinationPrefix?: string;
    }) => {
      if (!accountId) throw new Error("Account ID is required");
      return copyObjects(accountId, sourceBucket, keys, destinationBucket, destinationPrefix);
    },
    onSuccess: (result, variables) => {
      const { copied, errors } = result;
      
      if (errors.length === 0) {
        toast({
          title: "Batch copy successful",
          description: `Successfully copied ${copied.length} file(s)`,
        });
      } else if (copied.length > 0) {
        toast({
          title: "Partial batch copy",
          description: `Copied ${copied.length} file(s), but ${errors.length} file(s) failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Batch copy failed",
          description: "Failed to copy any files",
          variant: "destructive",
        });
      }
      
      // Invalidate the objects query to refresh both source and destination
      queryClient.invalidateQueries({ 
        queryKey: [`/api/s3/${accountId}/objects`, variables.sourceBucket] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/s3/${accountId}/objects`, variables.destinationBucket] 
      });
    },
    onError: (error) => {
      toast({
        title: "Batch copy failed",
        description: error instanceof Error ? error.message : "Failed to copy files",
        variant: "destructive",
      });
    },
  });
  
  // Batch move operation
  const batchMoveMutation = useMutation({
    mutationFn: async ({ 
      sourceBucket, 
      keys, 
      destinationBucket, 
      destinationPrefix = "" 
    }: { 
      sourceBucket: string; 
      keys: string[]; 
      destinationBucket: string;
      destinationPrefix?: string;
    }) => {
      if (!accountId) throw new Error("Account ID is required");
      return moveObjects(accountId, sourceBucket, keys, destinationBucket, destinationPrefix);
    },
    onSuccess: (result, variables) => {
      const { moved, errors } = result;
      
      if (errors.length === 0) {
        toast({
          title: "Batch move successful",
          description: `Successfully moved ${moved.length} file(s)`,
        });
      } else if (moved.length > 0) {
        toast({
          title: "Partial batch move",
          description: `Moved ${moved.length} file(s), but ${errors.length} file(s) failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Batch move failed",
          description: "Failed to move any files",
          variant: "destructive",
        });
      }
      
      // Invalidate the objects query to refresh both source and destination
      queryClient.invalidateQueries({ 
        queryKey: [`/api/s3/${accountId}/objects`, variables.sourceBucket] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/s3/${accountId}/objects`, variables.destinationBucket] 
      });
    },
    onError: (error) => {
      toast({
        title: "Batch move failed",
        description: error instanceof Error ? error.message : "Failed to move files",
        variant: "destructive",
      });
    },
  });
  
  // Single file rename operation
  const renameFileMutation = useMutation({
    mutationFn: async ({ 
      bucket, 
      sourceKey, 
      newName 
    }: { 
      bucket: string; 
      sourceKey: string; 
      newName: string;
    }) => {
      if (!accountId) throw new Error("Account ID is required");
      return renameObject(accountId, bucket, sourceKey, newName);
    },
    onSuccess: (_, variables) => {
      toast({
        title: "File renamed",
        description: "File has been renamed successfully",
      });
      
      // Invalidate the objects query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: [`/api/s3/${accountId}/objects`, variables.bucket] 
      });
    },
    onError: (error) => {
      toast({
        title: "Rename failed",
        description: error instanceof Error ? error.message : "Failed to rename file",
        variant: "destructive",
      });
    },
  });
  
  // Upload file operation
  const uploadFileMutation = useMutation({
    mutationFn: async ({ bucket, file, prefix = "" }: { bucket: string; file: File; prefix?: string }) => {
      if (!accountId) throw new Error("Account ID is required");
      
      // Update progress
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: {
          filename: file.name,
          progress: 0,
          status: "uploading"
        }
      }));
      
      // Define progress callback
      const onProgress = (progress: FileUploadProgress) => {
        setUploadProgress(prev => ({
          ...prev,
          [progress.filename]: progress
        }));
      };
      
      // Upload with progress tracking
      return uploadFile(accountId, bucket, file, prefix, onProgress);
    },
    onSuccess: (_, variables) => {
      const { file } = variables;
      
      // Mark as completed
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: {
          filename: file.name,
          progress: 100,
          status: "completed"
        }
      }));
      
      // Success toast is handled in the batch uploader to avoid multiple toasts
      queryClient.invalidateQueries({ 
        queryKey: [`/api/s3/${accountId}/objects`] 
      });
    },
    onError: (error: Error, variables) => {
      const { file } = variables;
      
      // Mark as error
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: {
          filename: file.name,
          progress: 0,
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed"
        }
      }));
      
      toast({
        title: "Upload failed",
        description: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });
  
  // Batch upload function
  const uploadBatch = async (bucket: string, files: File[], prefix = "") => {
    if (!accountId) {
      toast({
        title: "Upload failed",
        description: "Account ID is required",
        variant: "destructive",
      });
      return;
    }
    
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
      return;
    }
    
    // Initialize progress tracking
    const initialProgress: Record<string, FileUploadProgress> = {};
    files.forEach(file => {
      initialProgress[file.name] = {
        filename: file.name,
        progress: 0,
        status: "pending"
      };
    });
    
    setUploadProgress(initialProgress);
    
    // Upload files sequentially
    for (const file of files) {
      try {
        await uploadFileMutation.mutateAsync({ bucket, file, prefix });
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
      }
    }
    
    // Show success toast after all uploads
    const successful = Object.values(uploadProgress).filter(p => p.status === "completed").length;
    if (successful > 0) {
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${successful} of ${files.length} file(s)`,
      });
    }
  };
  
  // Reset upload progress
  const resetProgress = () => {
    setUploadProgress({});
  };
  
  return {
    // Single file operations
    deleteFile: (bucket: string, key: string) => deleteFileMutation.mutate({ bucket, key }),
    downloadFile,
    renameFile: (bucket: string, sourceKey: string, newName: string) => 
      renameFileMutation.mutate({ bucket, sourceKey, newName }),
    
    // Batch operations
    batchDelete: (bucket: string, keys: string[]) => 
      batchDeleteMutation.mutate({ bucket, keys }),
    batchMove: (sourceBucket: string, keys: string[], destinationBucket: string, destinationPrefix = "") => 
      batchMoveMutation.mutate({ sourceBucket, keys, destinationBucket, destinationPrefix }),
    batchCopy: (sourceBucket: string, keys: string[], destinationBucket: string, destinationPrefix = "") => 
      batchCopyMutation.mutate({ sourceBucket, keys, destinationBucket, destinationPrefix }),
    batchDownload: (bucket: string, keys: string[]) => downloadFiles(bucket, keys),
    
    // Upload operations
    uploadFile: (bucket: string, file: File, prefix = "") => 
      uploadFileMutation.mutate({ bucket, file, prefix }),
    uploadBatch,
    uploadProgress,
    resetProgress,
    
    // Loading states
    isDeleting: deleteFileMutation.isPending,
    isDownloading: downloadFileMutation.isPending,
    isBatchDeleting: batchDeleteMutation.isPending,
    isBatchDownloading: false, // We don't have a proper mutation for batch downloads
    isBatchMoving: batchMoveMutation.isPending,
    isBatchCopying: batchCopyMutation.isPending,
    isUploading: uploadFileMutation.isPending,
  };
}
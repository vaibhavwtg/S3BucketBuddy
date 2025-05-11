import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listBuckets, listObjects, deleteObject, getDownloadUrl, uploadFile } from "@/lib/s3";
import { useToast } from "@/hooks/use-toast";
import { S3Bucket, S3Object, S3CommonPrefix, S3ListObjectsResult, FileUploadProgress } from "@/lib/types";

/**
 * Hook for working with S3 buckets
 */
export function useS3Buckets(accountId: number | undefined) {
  const enabled = typeof accountId === 'number';
  
  return useQuery({
    queryKey: [`/api/s3/${accountId}/buckets`],
    queryFn: () => listBuckets(accountId as number),
    enabled,
  });
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
  const isEnabled = enabled && typeof accountId === 'number' && typeof bucket === 'string';
  
  return useQuery<S3ListObjectsResult>({
    queryKey: [`/api/s3/${accountId}/objects`, bucket, prefix],
    queryFn: () => listObjects(accountId as number, bucket as string, prefix),
    enabled: isEnabled,
  });
}

/**
 * Hook for S3 file operations (delete, download)
 */
export function useS3FileOperations(accountId: number | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const downloadFile = async (bucket: string, key: string) => {
    if (!accountId) {
      toast({
        title: "Download failed",
        description: "Account ID is required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const signedUrl = await getDownloadUrl(accountId, bucket, key);
      
      // Create a temporary link and click it to start the download
      const link = document.createElement("a");
      link.href = signedUrl;
      link.setAttribute("download", key.split("/").pop() || "download");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Your file will download shortly",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to generate download link",
        variant: "destructive",
      });
    }
  };

  return {
    deleteFile: (bucket: string, key: string) => deleteFileMutation.mutate({ bucket, key }),
    downloadFile,
    isDeleting: deleteFileMutation.isPending,
  };
}

/**
 * Hook for uploading files to S3
 */
export function useS3Upload(accountId: number | undefined) {
  const [uploadProgress, setUploadProgress] = useState<Record<string, FileUploadProgress>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadFileMutation = useMutation({
    mutationFn: async ({ 
      bucket, 
      file, 
      prefix = "" 
    }: { 
      bucket: string; 
      file: File; 
      prefix?: string; 
    }) => {
      if (!accountId) throw new Error("Account ID is required");
      
      // Track progress for this file
      const onProgress = (progress: FileUploadProgress) => {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: progress
        }));
      };
      
      return uploadFile(accountId, bucket, file, prefix, onProgress);
    },
    onSuccess: (_, variables) => {
      // Set completed status
      setUploadProgress(prev => ({
        ...prev,
        [variables.file.name]: {
          filename: variables.file.name,
          progress: 100,
          status: "completed",
        }
      }));
      
      // Invalidate the objects query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: [`/api/s3/${accountId}/objects`, variables.bucket] 
      });
    },
    onError: (error, variables) => {
      // Set error status
      setUploadProgress(prev => ({
        ...prev,
        [variables.file.name]: {
          filename: variables.file.name,
          progress: 0,
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        }
      }));
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const uploadBatch = async (bucket: string, files: File[], prefix = "") => {
    if (!accountId) {
      toast({
        title: "Upload failed",
        description: "Account ID is required",
        variant: "destructive",
      });
      return;
    }
    
    // Initialize progress for all files
    const initialProgress: Record<string, FileUploadProgress> = {};
    files.forEach(file => {
      initialProgress[file.name] = {
        filename: file.name,
        progress: 0,
        status: "pending",
      };
    });
    setUploadProgress(initialProgress);
    
    // Upload files sequentially to avoid overwhelming the network
    for (const file of files) {
      try {
        await uploadFileMutation.mutateAsync({ bucket, file, prefix });
      } catch (error) {
        // Error is already handled in the mutation
        continue;
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

  const resetProgress = () => {
    setUploadProgress({});
  };

  return {
    uploadFile: (bucket: string, file: File, prefix = "") => 
      uploadFileMutation.mutate({ bucket, file, prefix }),
    uploadBatch,
    uploadProgress,
    resetProgress,
    isUploading: uploadFileMutation.isPending,
  };
}

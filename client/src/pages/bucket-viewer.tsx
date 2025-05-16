import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { FileIcon, FolderIcon, ArrowUp, Download, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

/**
 * Simple S3 Bucket Viewer component
 * This is a streamlined version focusing only on the core functionality
 * of displaying files from a specific account and bucket
 */
export default function BucketViewer() {
  const params = useParams<{ accountId: string; bucket?: string }>();
  const [location, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Current state
  const [prefix, setPrefix] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  
  // Parse account ID
  const accountId = params.accountId ? parseInt(params.accountId, 10) : undefined;
  const bucket = params.bucket || "";
  
  // Load buckets for the account
  const { data: buckets = [], isLoading: bucketsLoading } = useQuery({
    queryKey: [`/api/s3/${accountId}/buckets`],
    enabled: isAuthenticated && !!accountId,
  });
  
  // Load contents of the current bucket and prefix
  const loadBucketContents = async () => {
    if (!accountId || !bucket) return;
    
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        bucket,
        prefix: prefix || "",
        delimiter: "/"
      });
      
      const response = await fetch(`/api/s3/${accountId}/objects?${queryParams.toString()}`, {
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load bucket contents: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Bucket contents:", data);
      
      setFiles(Array.isArray(data.objects) ? data.objects : []);
      setFolders(Array.isArray(data.folders) ? data.folders : []);
    } catch (error) {
      console.error("Error loading bucket contents:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load bucket contents",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Select a bucket
  const handleSelectBucket = (bucketName: string) => {
    navigate(`/bucket-viewer/${accountId}/${bucketName}`);
  };
  
  // Navigate to a folder
  const handleOpenFolder = (folderPrefix: string) => {
    setPrefix(folderPrefix);
  };
  
  // Navigate up one level
  const handleNavigateUp = () => {
    if (!prefix) return;
    
    const parts = prefix.split('/').filter(Boolean);
    parts.pop();
    
    const newPrefix = parts.length > 0 ? `${parts.join('/')}/` : "";
    setPrefix(newPrefix);
  };
  
  // Download a file
  const handleDownload = async (key: string) => {
    try {
      const response = await apiRequest(
        "GET", 
        `/api/s3/${accountId}/download?bucket=${bucket}&key=${encodeURIComponent(key)}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to get download URL");
      }
      
      const data = await response.json();
      
      // Open download URL in a new tab
      window.open(data.url, "_blank");
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Could not download file",
        variant: "destructive"
      });
    }
  };
  
  // Delete a file
  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete ${key}?`)) return;
    
    try {
      await apiRequest(
        "DELETE", 
        `/api/s3/${accountId}/objects`,
        { bucket, key }
      );
      
      toast({
        title: "File deleted",
        description: "File has been deleted successfully"
      });
      
      // Refresh the file list
      loadBucketContents();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete file",
        variant: "destructive"
      });
    }
  };
  
  // Load bucket contents when bucket or prefix changes
  useEffect(() => {
    if (isAuthenticated && accountId && bucket) {
      loadBucketContents();
    }
  }, [isAuthenticated, accountId, bucket, prefix]);
  
  // Redirect to auth page if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to access your buckets",
        variant: "destructive"
      });
      navigate("/auth");
    }
  }, [isAuthenticated, authLoading, navigate, toast]);
  
  // If still loading auth status, show loading indicator
  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Layout>
    );
  }
  
  // If authenticated but no bucket selected, show bucket selection screen
  if (!bucket && accountId && Array.isArray(buckets) && buckets.length > 0) {
    return (
      <Layout>
        <div className="container py-6">
          <h1 className="text-2xl font-bold mb-6">Select a Bucket</h1>
          
          {bucketsLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {buckets.map((bucket: any) => (
                <div 
                  key={bucket.Name}
                  className="border rounded-lg p-4 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleSelectBucket(bucket.Name)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-primary">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium">{bucket.Name}</h3>
                      <p className="text-sm text-muted-foreground">{bucket.CreationDate ? new Date(bucket.CreationDate).toLocaleDateString() : "Unknown date"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    );
  }
  
  // Show the bucket contents
  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{bucket}</h1>
            <div className="text-sm text-muted-foreground">
              Current path: {prefix || '/'}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleNavigateUp}
              disabled={!prefix}
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Up
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadBucketContents}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Folders */}
            {folders && folders.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3">Folders</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {folders.map((folder, index) => (
                    <div 
                      key={`folder-${index}`}
                      className="border rounded-lg p-3 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleOpenFolder(folder.Prefix)}
                    >
                      <div className="flex items-center space-x-3">
                        <FolderIcon className="h-5 w-5 text-blue-500" />
                        <span className="truncate">{folder.Prefix.split('/').filter(Boolean).pop()}/</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Files */}
            {files && files.length > 0 ? (
              <div>
                <h2 className="text-lg font-medium mb-3">Files</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {files.map((file, index) => {
                    // Skip files that are actually the current folder prefix
                    if (prefix && file.Key === prefix) return null;
                    
                    // Filter out files not in the current directory
                    const relativePath = file.Key.substring(prefix.length);
                    if (relativePath.includes('/')) return null;
                    
                    return (
                      <div 
                        key={`file-${index}`}
                        className="border rounded-lg p-3 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <FileIcon className="h-5 w-5 text-gray-500" />
                          <span className="truncate flex-1">{relativePath}</span>
                          
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file.Key);
                              }}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(file.Key);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatFileSize(file.Size)} • {formatDate(file.LastModified)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {folders && folders.length === 0 ? "This bucket is empty" : "No files in this folder"}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Helper to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
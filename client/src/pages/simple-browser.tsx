import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { FileIcon, FolderIcon, ArrowUp, Download, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Ultra-simple S3 browser component
 * Created to avoid React hooks errors in the more complex browser
 */
export default function SimpleBrowser() {
  // Navigation
  const params = useParams<{ accountId: string; bucketName?: string }>();
  const [location, navigate] = useLocation();
  
  // Auth
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // State
  const [accountId, setAccountId] = useState<number | undefined>(undefined);
  const [bucketName, setBucketName] = useState<string>("");
  const [prefix, setPrefix] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  
  // Parse parameters from URL
  useEffect(() => {
    if (params.accountId) {
      const id = parseInt(params.accountId, 10);
      if (!isNaN(id)) {
        setAccountId(id);
      }
    }
    
    if (params.bucketName) {
      setBucketName(params.bucketName);
    } else {
      setBucketName("");
    }
    
    // Reset prefix when changing buckets
    setPrefix("");
  }, [params.accountId, params.bucketName]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !user) {
      toast({
        title: "Authentication required",
        description: "Please log in to access your buckets",
        variant: "destructive"
      });
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate, toast]);
  
  // Load buckets for the account
  useEffect(() => {
    if (!accountId || !isAuthenticated) return;
    
    setLoading(true);
    
    fetch(`/api/s3/${accountId}/buckets`, {
      credentials: "include"
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load buckets: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("Buckets loaded:", data);
        setBuckets(data);
      })
      .catch(error => {
        console.error("Error loading buckets:", error);
        toast({
          title: "Error",
          description: `Failed to load buckets: ${error.message}`,
          variant: "destructive"
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accountId, isAuthenticated, toast]);
  
  // Load objects (files and folders) when bucket and prefix change
  useEffect(() => {
    if (!accountId || !bucketName || !isAuthenticated) return;
    
    setLoading(true);
    
    const queryParams = new URLSearchParams({
      bucket: bucketName,
      prefix: prefix || "",
      delimiter: "/"
    });
    
    fetch(`/api/s3/${accountId}/objects?${queryParams.toString()}`, {
      credentials: "include"
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load bucket contents: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("Objects loaded:", data);
        if (Array.isArray(data.objects)) {
          setFiles(data.objects);
        } else {
          setFiles([]);
        }
        
        if (Array.isArray(data.folders)) {
          setFolders(data.folders);
        } else {
          setFolders([]);
        }
      })
      .catch(error => {
        console.error("Error loading bucket contents:", error);
        toast({
          title: "Error",
          description: `Failed to load bucket contents: ${error.message}`,
          variant: "destructive"
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accountId, bucketName, prefix, isAuthenticated, toast]);
  
  // Navigate to bucket
  const handleSelectBucket = (name: string) => {
    navigate(`/simple-browser/${accountId}/${name}`);
  };
  
  // Navigate to folder
  const handleOpenFolder = (folderPrefix: string) => {
    setPrefix(folderPrefix);
  };
  
  // Go up one level
  const handleNavigateUp = () => {
    if (!prefix) {
      // If at bucket root, go back to bucket selection
      navigate(`/simple-browser/${accountId}`);
      return;
    }
    
    // Remove last folder from prefix
    const parts = prefix.split('/').filter(Boolean);
    parts.pop();
    const newPrefix = parts.length > 0 ? `${parts.join('/')}/` : "";
    setPrefix(newPrefix);
  };
  
  // Download a file
  const handleDownload = (key: string) => {
    if (!accountId || !bucketName) return;
    
    setLoading(true);
    
    fetch(`/api/s3/${accountId}/download?bucket=${bucketName}&key=${encodeURIComponent(key)}`, {
      credentials: "include"
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to get download URL");
        }
        return response.json();
      })
      .then(data => {
        if (data.url) {
          // Open download URL in a new tab
          window.open(data.url, "_blank");
          toast({
            title: "Download started",
            description: "Your file download has started"
          });
        } else {
          throw new Error("No download URL received");
        }
      })
      .catch(error => {
        console.error("Download error:", error);
        toast({
          title: "Download failed",
          description: error.message || "Could not download file",
          variant: "destructive"
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  // Delete a file
  const handleDelete = (key: string) => {
    if (!accountId || !bucketName) return;
    
    if (!confirm(`Are you sure you want to delete ${key}?`)) {
      return;
    }
    
    setLoading(true);
    
    fetch(`/api/s3/${accountId}/objects`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ bucket: bucketName, key }),
      credentials: "include"
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to delete file");
        }
        return response.json();
      })
      .then(() => {
        toast({
          title: "File deleted",
          description: "File has been deleted successfully"
        });
        
        // Refresh the file list
        const queryParams = new URLSearchParams({
          bucket: bucketName,
          prefix: prefix || "",
          delimiter: "/"
        });
        
        return fetch(`/api/s3/${accountId}/objects?${queryParams.toString()}`, {
          credentials: "include"
        });
      })
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data.objects)) {
          setFiles(data.objects);
        }
        if (Array.isArray(data.folders)) {
          setFolders(data.folders);
        }
      })
      .catch(error => {
        console.error("Delete error:", error);
        toast({
          title: "Delete failed",
          description: error.message || "Could not delete file",
          variant: "destructive"
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  // Refresh current view
  const handleRefresh = () => {
    if (!accountId) return;
    
    if (!bucketName) {
      // Refresh buckets list
      setLoading(true);
      
      fetch(`/api/s3/${accountId}/buckets`, {
        credentials: "include"
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to refresh buckets: ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          setBuckets(data);
        })
        .catch(error => {
          toast({
            title: "Refresh failed",
            description: error.message || "Could not refresh buckets",
            variant: "destructive"
          });
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Refresh current bucket contents
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        bucket: bucketName,
        prefix: prefix || "",
        delimiter: "/"
      });
      
      fetch(`/api/s3/${accountId}/objects?${queryParams.toString()}`, {
        credentials: "include"
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to refresh bucket contents: ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          if (Array.isArray(data.objects)) {
            setFiles(data.objects);
          }
          if (Array.isArray(data.folders)) {
            setFolders(data.folders);
          }
        })
        .catch(error => {
          toast({
            title: "Refresh failed",
            description: error.message || "Could not refresh bucket contents",
            variant: "destructive"
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };
  
  // Show loading spinner
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Layout>
    );
  }
  
  // Show bucket selection if no bucket is selected
  if (!bucketName) {
    return (
      <Layout>
        <div className="container py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Select a Bucket</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {buckets.length > 0 ? (
                buckets.map(bucket => (
                  <Card 
                    key={bucket.Name}
                    className="p-4 hover:bg-muted cursor-pointer transition-colors"
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
                        <p className="text-sm text-muted-foreground">
                          {bucket.CreationDate ? new Date(bucket.CreationDate).toLocaleDateString() : "Unknown date"}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-3 text-center py-10">
                  <p className="text-muted-foreground mb-4">No buckets found for this account</p>
                  <Button onClick={() => navigate("/account-manager")}>
                    Manage S3 Accounts
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    );
  }
  
  // Show bucket contents
  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              {bucketName}
              {prefix && (
                <span className="text-lg ml-2 text-muted-foreground">
                  /{prefix}
                </span>
              )}
            </h1>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleNavigateUp}
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Up
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Folders */}
            {folders.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3">Folders</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {folders.map((folder, index) => (
                    <Card
                      key={`folder-${index}`}
                      className="p-3 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleOpenFolder(folder.Prefix)}
                    >
                      <div className="flex items-center space-x-3">
                        <FolderIcon className="h-5 w-5 text-blue-500" />
                        <span className="truncate">{folder.Prefix.split('/').filter(Boolean).pop()}/</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Files */}
            {files.length > 0 ? (
              <div>
                <h2 className="text-lg font-medium mb-3">Files</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {files.map((file, index) => {
                    // Skip files that are actually the current folder prefix
                    if (prefix && file.Key === prefix) return null;
                    
                    // Filter out files not in the current directory
                    if (prefix) {
                      const relativePath = file.Key.substring(prefix.length);
                      if (relativePath.includes('/')) return null;
                    } else {
                      if (file.Key.includes('/')) return null;
                    }
                    
                    return (
                      <Card
                        key={`file-${index}`}
                        className="p-3 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <FileIcon className="h-5 w-5 text-gray-500" />
                          <span className="truncate flex-1">
                            {prefix ? file.Key.substring(prefix.length) : file.Key}
                          </span>
                          
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
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {folders.length === 0 ? "This bucket is empty" : "No files in this folder"}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

// Format file size (bytes to human readable)
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Format date string to user-friendly format
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
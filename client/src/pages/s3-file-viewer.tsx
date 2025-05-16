import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { FileIcon, FolderIcon, ArrowUp, Download, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

/**
 * Direct S3 file viewer that doesn't allow bucket selection
 * Shows files from the account's default bucket directly
 */
export default function S3FileViewer() {
  // Navigation
  const params = useParams<{ accountId: string }>();
  const [location, navigate] = useLocation();
  
  // Auth
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // State
  const [prefix, setPrefix] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  
  // Parse account ID from URL
  const accountId = params.accountId ? parseInt(params.accountId, 10) : undefined;
  
  // Get account details to get the default bucket
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/s3-accounts'],
    enabled: isAuthenticated
  });
  
  // Find the current account
  const currentAccount = accounts.find((acc: any) => acc.id === accountId);
  const defaultBucket = currentAccount?.defaultBucket;
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !user) {
      toast({
        title: "Authentication required",
        description: "Please log in to access your files",
        variant: "destructive"
      });
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate, toast]);
  
  // Redirect to account manager if no account ID
  useEffect(() => {
    if (isAuthenticated && !accountId) {
      toast({
        title: "No account selected",
        description: "Please select an S3 account to view files",
      });
      navigate("/account-manager");
    }
  }, [isAuthenticated, accountId, navigate, toast]);
  
  // Load objects (files and folders) when account and prefix change
  useEffect(() => {
    if (!accountId || !defaultBucket || !isAuthenticated) return;
    
    setLoading(true);
    
    const queryParams = new URLSearchParams({
      bucket: defaultBucket,
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
          description: `Failed to load files: ${error.message}`,
          variant: "destructive"
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accountId, defaultBucket, prefix, isAuthenticated, toast]);
  
  // Navigate to folder
  const handleOpenFolder = (folderPrefix: string) => {
    setPrefix(folderPrefix);
  };
  
  // Go up one level
  const handleNavigateUp = () => {
    if (!prefix) {
      // If at bucket root, go back to account manager
      navigate("/account-manager");
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
    if (!accountId || !defaultBucket) return;
    
    setLoading(true);
    
    fetch(`/api/s3/${accountId}/download?bucket=${defaultBucket}&key=${encodeURIComponent(key)}`, {
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
    if (!accountId || !defaultBucket) return;
    
    if (!confirm(`Are you sure you want to delete ${key}?`)) {
      return;
    }
    
    setLoading(true);
    
    fetch(`/api/s3/${accountId}/objects`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ bucket: defaultBucket, key }),
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
          bucket: defaultBucket,
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
    if (!accountId || !defaultBucket) return;
    
    setLoading(true);
    
    const queryParams = new URLSearchParams({
      bucket: defaultBucket,
      prefix: prefix || "",
      delimiter: "/"
    });
    
    fetch(`/api/s3/${accountId}/objects?${queryParams.toString()}`, {
      credentials: "include"
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to refresh files: ${response.statusText}`);
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
        
        toast({
          title: "Refreshed",
          description: "File list has been refreshed"
        });
      })
      .catch(error => {
        toast({
          title: "Refresh failed",
          description: error.message || "Could not refresh files",
          variant: "destructive"
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  // Show loading spinner when authentication is in progress
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Layout>
    );
  }
  
  // Show message if no account is selected
  if (!accountId) {
    return (
      <Layout>
        <div className="container py-6 text-center">
          <h1 className="text-2xl font-bold mb-4">No S3 Account Selected</h1>
          <p className="mb-4">Please select an S3 account to view files.</p>
          <Button onClick={() => navigate("/account-manager")}>
            Manage S3 Accounts
          </Button>
        </div>
      </Layout>
    );
  }
  
  // Show message if account has no default bucket
  if (!defaultBucket) {
    return (
      <Layout>
        <div className="container py-6 text-center">
          <h1 className="text-2xl font-bold mb-4">No Default Bucket</h1>
          <p className="mb-4">This account does not have a default bucket configured.</p>
          <Button onClick={() => navigate("/account-manager")}>
            Manage S3 Accounts
          </Button>
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
              {defaultBucket}
              {prefix && (
                <span className="text-lg ml-2 text-muted-foreground">
                  /{prefix}
                </span>
              )}
            </h1>
            {currentAccount && (
              <p className="text-sm text-muted-foreground">
                Account: {currentAccount.name} • Region: {currentAccount.region}
              </p>
            )}
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
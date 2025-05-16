import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { UploadDialog } from "@/components/dialogs/UploadDialog";
import { ShareDialog } from "@/components/dialogs/ShareDialog";
import { BatchOperationDialog } from "@/components/dialogs/BatchOperationDialog";
import { useAuth } from "@/hooks/use-auth";
import { 
  FileIcon, FolderIcon, ArrowUp, Download, Trash2, RefreshCw,
  Grid, List, Upload, Filter, Search, SortAsc, SortDesc,
  Share, Copy, Move, CheckSquare, Square, CheckCheck 
} from "lucide-react";
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
  
  // State for files and directories
  const [prefix, setPrefix] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  
  // UI State for filters, sorting, and selection
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredFiles, setFilteredFiles] = useState<any[]>([]);
  const [filteredFolders, setFilteredFolders] = useState<any[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, any>>({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  
  // Dialogs
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareFile, setShareFile] = useState<any>(null);
  const [isBatchOperationOpen, setIsBatchOperationOpen] = useState(false);
  const [batchOperationType, setBatchOperationType] = useState<'move' | 'copy'>('move');
  
  // Parse account ID from URL
  const accountId = params.accountId ? parseInt(params.accountId, 10) : undefined;
  
  // Get account details to get the default bucket
  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ['/api/s3-accounts'],
    enabled: isAuthenticated
  });
  
  // Find the current account
  const currentAccount = accounts?.find((acc) => acc.id === accountId);
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
  
  // Apply filtering and sorting to files and folders
  useEffect(() => {
    // Filter files based on search query and file type
    let filtered = [...files];
    
    // Apply search filter if there's a query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file => {
        const fileName = prefix ? file.Key.substring(prefix.length) : file.Key;
        return fileName.toLowerCase().includes(query);
      });
    }
    
    // Apply file type filter if not "all"
    if (fileTypeFilter !== "all") {
      filtered = filtered.filter(file => {
        const fileName = file.Key.split('/').pop() || '';
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        
        switch (fileTypeFilter) {
          case "images":
            return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension);
          case "documents":
            return ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension);
          case "videos":
            return ['mp4', 'webm', 'mov', 'avi', 'wmv', 'flv', 'mkv'].includes(extension);
          case "audio":
            return ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(extension);
          default:
            return true;
        }
      });
    }
    
    // Sort the filtered files
    filtered.sort((a, b) => {
      const fileNameA = a.Key.split('/').pop() || '';
      const fileNameB = b.Key.split('/').pop() || '';
      
      if (sortBy === 'name') {
        return sortDirection === 'asc' 
          ? fileNameA.localeCompare(fileNameB) 
          : fileNameB.localeCompare(fileNameA);
      } else if (sortBy === 'size') {
        return sortDirection === 'asc' 
          ? a.Size - b.Size 
          : b.Size - a.Size;
      } else if (sortBy === 'date') {
        const dateA = new Date(a.LastModified).getTime();
        const dateB = new Date(b.LastModified).getTime();
        return sortDirection === 'asc' 
          ? dateA - dateB 
          : dateB - dateA;
      }
      return 0;
    });
    
    setFilteredFiles(filtered);
    
    // Filter folders based on search query
    let filteredDirs = [...folders];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredDirs = filteredDirs.filter(folder => {
        const folderName = folder.Prefix.split('/').filter(Boolean).pop() || '';
        return folderName.toLowerCase().includes(query);
      });
    }
    
    // Sort folders by name only
    filteredDirs.sort((a, b) => {
      const folderNameA = a.Prefix.split('/').filter(Boolean).pop() || '';
      const folderNameB = b.Prefix.split('/').filter(Boolean).pop() || '';
      
      return sortDirection === 'asc'
        ? folderNameA.localeCompare(folderNameB)
        : folderNameB.localeCompare(folderNameA);
    });
    
    setFilteredFolders(filteredDirs);
  }, [files, folders, searchQuery, fileTypeFilter, sortBy, sortDirection, prefix]);

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
        if (Array.isArray(data.objects)) {
          setFiles(data.objects);
          setFilteredFiles(data.objects);
        } else {
          setFiles([]);
          setFilteredFiles([]);
        }
        
        if (Array.isArray(data.folders)) {
          setFolders(data.folders);
          setFilteredFolders(data.folders);
        } else {
          setFolders([]);
          setFilteredFolders([]);
        }
        
        // Reset selection when loading new data
        setSelectedFiles({});
        setSelectionMode(false);
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
  
  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Add new handlers for file selection and batch operations
  const handleToggleSelection = (file: any) => {
    setSelectedFiles(prev => {
      const newSelected = { ...prev };
      if (newSelected[file.Key]) {
        delete newSelected[file.Key];
      } else {
        newSelected[file.Key] = file;
      }
      return newSelected;
    });
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      setSelectedFiles({});
    }
  };

  // Handle batch delete
  const handleBatchDelete = () => {
    const selectedKeys = Object.keys(selectedFiles);
    if (selectedKeys.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to delete",
        variant: "destructive"
      });
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedKeys.length} files?`)) {
      return;
    }
    
    setLoading(true);
    
    // Delete files one by one
    Promise.all(
      selectedKeys.map(key => 
        fetch(`/api/s3/${accountId}/objects`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ bucket: defaultBucket, key }),
          credentials: "include"
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Failed to delete ${key}`);
          }
          return response.json();
        })
      )
    )
    .then(() => {
      toast({
        title: "Files deleted",
        description: `${selectedKeys.length} files have been deleted`
      });
      
      // Refresh the file list and clear selection
      handleRefresh();
      setSelectedFiles({});
    })
    .catch(error => {
      console.error("Batch delete error:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete some files",
        variant: "destructive"
      });
    })
    .finally(() => {
      setLoading(false);
    });
  };

  // Handle batch copy
  const handleBatchCopy = () => {
    if (Object.keys(selectedFiles).length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to copy",
        variant: "destructive"
      });
      return;
    }
    setBatchOperationType('copy');
    setIsBatchOperationOpen(true);
  };

  // Handle batch move
  const handleBatchMove = () => {
    if (Object.keys(selectedFiles).length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to move",
        variant: "destructive"
      });
      return;
    }
    setBatchOperationType('move');
    setIsBatchOperationOpen(true);
  };

  // Handle share file
  const handleShareFile = (file: any) => {
    setShareFile(file);
    setIsShareOpen(true);
  };

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
        
        {/* Toolbar with search, filters, and view controls */}
        <div className="bg-card rounded-lg p-3 mb-6 border">
          <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
            {/* Left side: Search and filter */}
            <div className="flex flex-1 w-full lg:w-auto gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={showFilterPanel ? "bg-muted" : ""}
              >
                <Filter className="h-4 w-4" />
              </Button>
              
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as any)}
              >
                <SelectTrigger className="w-[120px]">
                  <span className="flex items-center gap-1">
                    <SortAsc className="h-4 w-4" /> Sort
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={toggleSortDirection}
              >
                {sortDirection === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Right side: View controls and actions */}
            <div className="flex gap-2 w-full lg:w-auto justify-end">
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4 mr-1" /> Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4 mr-1" /> List
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className={selectionMode ? "bg-primary text-white" : ""}
                onClick={toggleSelectionMode}
              >
                {selectionMode ? (
                  <>
                    <CheckCheck className="h-4 w-4 mr-1" /> 
                    Select ({Object.keys(selectedFiles).length})
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-1" /> 
                    Select
                  </>
                )}
              </Button>
              
              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-1" /> Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <UploadDialog 
                    accountId={accountId} 
                    bucket={defaultBucket}
                    prefix={prefix}
                    onSuccess={handleRefresh}
                    onClose={() => setIsUploadOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Expandable filter panel */}
          {showFilterPanel && (
            <div className="mt-3 pt-3 border-t">
              <h3 className="text-sm font-medium mb-2">Filter by file type</h3>
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant={fileTypeFilter === "all" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFileTypeFilter("all")}
                >
                  All Files
                </Badge>
                <Badge 
                  variant={fileTypeFilter === "images" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFileTypeFilter("images")}
                >
                  Images
                </Badge>
                <Badge 
                  variant={fileTypeFilter === "documents" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFileTypeFilter("documents")}
                >
                  Documents
                </Badge>
                <Badge 
                  variant={fileTypeFilter === "videos" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFileTypeFilter("videos")}
                >
                  Videos
                </Badge>
                <Badge 
                  variant={fileTypeFilter === "audio" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFileTypeFilter("audio")}
                >
                  Audio
                </Badge>
              </div>
            </div>
          )}
          
          {/* Batch operation controls */}
          {selectionMode && Object.keys(selectedFiles).length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">
                    {Object.keys(selectedFiles).length} files selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleBatchCopy}
                  >
                    <Copy className="h-4 w-4 mr-1" /> Copy
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleBatchMove}
                  >
                    <Move className="h-4 w-4 mr-1" /> Move
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={handleBatchDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Folders */}
            {filteredFolders.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3">Folders</h2>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredFolders.map((folder, index) => (
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
                ) : (
                  <div className="border rounded-md divide-y">
                    {filteredFolders.map((folder, index) => (
                      <div
                        key={`folder-${index}`}
                        className="p-3 hover:bg-muted cursor-pointer transition-colors flex items-center"
                        onClick={() => handleOpenFolder(folder.Prefix)}
                      >
                        <FolderIcon className="h-5 w-5 text-blue-500 mr-3" />
                        <span className="flex-1">{folder.Prefix.split('/').filter(Boolean).pop()}/</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Files */}
            {filteredFiles.length > 0 ? (
              <div>
                <h2 className="text-lg font-medium mb-3">Files</h2>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredFiles.map((file, index) => {
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
                          className={`p-3 hover:bg-muted transition-colors ${selectionMode ? 'cursor-pointer' : ''}`}
                          onClick={() => selectionMode && handleToggleSelection(file)}
                        >
                          <div className="flex items-center space-x-3">
                            {selectionMode && (
                              <Checkbox 
                                checked={!!selectedFiles[file.Key]} 
                                onCheckedChange={() => handleToggleSelection(file)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
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
                                  handleShareFile(file);
                                }}
                                title="Share"
                              >
                                <Share className="h-4 w-4" />
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
                ) : (
                  <div className="border rounded-md divide-y">
                    {filteredFiles.map((file, index) => {
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
                        <div
                          key={`file-${index}`}
                          className={`p-3 hover:bg-muted transition-colors flex items-center ${selectionMode ? 'cursor-pointer' : ''}`}
                          onClick={() => selectionMode && handleToggleSelection(file)}
                        >
                          {selectionMode && (
                            <Checkbox 
                              checked={!!selectedFiles[file.Key]} 
                              onCheckedChange={() => handleToggleSelection(file)}
                              onClick={(e) => e.stopPropagation()}
                              className="mr-3"
                            />
                          )}
                          <FileIcon className="h-5 w-5 text-gray-500 mr-3" />
                          <div className="flex-1">
                            <div className="truncate">
                              {prefix ? file.Key.substring(prefix.length) : file.Key}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(file.Size)} • {formatDate(file.LastModified)}
                            </div>
                          </div>
                          
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
                                handleShareFile(file);
                              }}
                              title="Share"
                            >
                              <Share className="h-4 w-4" />
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
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {folders.length === 0 && files.length === 0 
                  ? "This bucket is empty" 
                  : searchQuery 
                    ? "No files match your search" 
                    : "No files in this folder"}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Share Dialog */}
      <ShareDialog 
        isOpen={isShareOpen} 
        onOpenChange={setIsShareOpen}
        file={shareFile}
        accountId={accountId}
        bucket={defaultBucket}
      />
      
      {/* Batch Operation Dialog */}
      <BatchOperationDialog
        isOpen={isBatchOperationOpen}
        onOpenChange={setIsBatchOperationOpen}
        operation={batchOperationType}
        files={Object.values(selectedFiles)}
        accountId={accountId}
        currentBucket={defaultBucket}
        currentPrefix={prefix}
        onSuccess={() => {
          handleRefresh();
          setSelectedFiles({});
          setSelectionMode(false);
        }}
      />
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
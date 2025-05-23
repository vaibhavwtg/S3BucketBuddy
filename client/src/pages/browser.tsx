import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Layout } from "@/components/layout/Layout";
// Debug helper for browser component
const DEBUG = true;
import { Breadcrumbs } from "@/components/files/Breadcrumbs";
import { FileActions } from "@/components/files/FileActions";
import { FileCard } from "@/components/files/FileCard";
import { FolderCard } from "@/components/files/FolderCard";
import { StorageStats } from "@/components/files/StorageStats";
import { Button } from "@/components/ui/button";
import { useS3Buckets, useS3Objects, useS3FileOperations, useAllS3Buckets } from "@/hooks/use-s3";
import { S3Bucket, S3Object, S3CommonPrefix, S3Account, EnhancedS3Bucket } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UploadDialog } from "@/components/dialogs/UploadDialog";
import { BatchOperationDialog } from "@/components/dialogs/BatchOperationDialog";
import { ShareDialog } from "@/components/dialogs/ShareDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Browser() {
  const [location, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast: notify } = useToast();

  // State for UI controls and selections
  const [sortBy, setSortBy] = useState<string>("name");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredFiles, setFilteredFiles] = useState<S3Object[]>([]);
  const [filteredFolders, setFilteredFolders] = useState<S3CommonPrefix[]>([]);
  
  // Get user settings for view mode preference
  const { data: userSettings } = useQuery({
    queryKey: ['/api/user-settings'],
  });
  
  // Set viewMode based on user settings or default to grid
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Update viewMode when user settings change
  useEffect(() => {
    if (userSettings?.viewMode) {
      setViewMode(userSettings.viewMode as 'grid' | 'list');
    }
  }, [userSettings]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, S3Object>>({});
  
  // State for dialog controls
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);
  const [isBatchCopyOpen, setIsBatchCopyOpen] = useState(false);
  const [currentBatchOperation, setCurrentBatchOperation] = useState<"move" | "copy">("move");
  
  // State for file operations
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareFile, setShareFile] = useState<{
    accountId: number;
    bucket: string;
    path: string;
    filename: string;
    contentType?: string;
    size: number;
  }>({
    accountId: 0,
    bucket: '',
    path: '',
    filename: '',
    size: 0
  });
  
  // State for delete confirmation
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string>('');
  
  // Update user settings when view mode changes
  const updateViewModeMutation = useMutation({
    mutationFn: async (newViewMode: 'grid' | 'list') => {
      const res = await apiRequest("PATCH", "/api/user-settings", {
        viewMode: newViewMode
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save view preference",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Check if user is authenticated and redirect if not
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      notify({
        title: "Authentication Required",
        description: "Please log in to access your S3 buckets",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }
  }, [authLoading, isAuthenticated, navigate, notify]);
  
  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const accountIdParam = urlParams.get('account');
  const bucketParam = urlParams.get('bucket');
  const prefixParam = urlParams.get('prefix') || "";
  
  // Parse account ID to number or undefined
  const parsedAccountId = accountIdParam ? parseInt(accountIdParam) : undefined;
  
  // Use empty string for bucket and prefix if not provided
  const bucket = bucketParam || "";
  const prefix = prefixParam;
  
  // Debug log current parameters
  if (DEBUG) {
    console.log('Current browser parameters:', { 
      accountIdParam, 
      parsedAccountId, 
      bucket, 
      prefix 
    });
  }
  
  // Helper function for navigation with parameters
  const navigateTo = useCallback((params: { 
    account?: string | number, 
    bucket?: string, 
    prefix?: string 
  }) => {
    const queryParams = new URLSearchParams();
    
    // Only set parameters that are defined
    if (params.account !== undefined && params.account !== null) {
      queryParams.set('account', params.account.toString());
    }
    
    if (params.bucket) {
      queryParams.set('bucket', params.bucket);
    }
    
    if (params.prefix) {
      queryParams.set('prefix', params.prefix);
    }
    
    const navigationUrl = `/browser?${queryParams.toString()}`;
    
    if (DEBUG) {
      console.log('Navigating to:', { 
        params, 
        url: navigationUrl 
      });
    }
    
    // Perform the navigation
    navigate(navigationUrl);
  }, [navigate]);
  
  // Handle navigating to a folder
  const handleFolderClick = useCallback((folder: S3CommonPrefix) => {
    if (!folder.Prefix) {
      console.error('Cannot navigate to folder: missing Prefix property', folder);
      return;
    }
    
    if (DEBUG) console.log('Folder click:', folder.Prefix);
    
    navigateTo({
      account: parsedAccountId,
      bucket,
      prefix: folder.Prefix
    });
  }, [navigateTo, parsedAccountId, bucket]);
  
  // Handle navigating to parent folder
  const handleNavigateUp = useCallback(() => {
    if (!prefix) {
      // If no prefix, go back to bucket selection
      navigateTo({});
      return;
    }
    
    // Calculate parent prefix by removing the last path segment
    const pathParts = prefix.split('/').filter(Boolean); // Remove empty segments
    
    // Remove last segment (current folder)
    pathParts.pop();
    
    // Create parent prefix
    const parentPrefix = pathParts.length > 0 ? `${pathParts.join('/')}/` : '';
    
    if (DEBUG) console.log('Navigate up to:', parentPrefix);
    
    navigateTo({
      account: parsedAccountId,
      bucket,
      prefix: parentPrefix
    });
  }, [navigateTo, parsedAccountId, bucket, prefix]);
  
  // Handle bucket selection
  const handleSelectBucket = useCallback((selectedBucket: EnhancedS3Bucket) => {
    if (!selectedBucket || !selectedBucket.Name) {
      console.error('Invalid bucket selection:', selectedBucket);
      return;
    }
    
    // Log the bucket selection for debugging
    console.log('Selected bucket:', selectedBucket);
    
    // Use the accountId from the bucket if available, otherwise use the current one
    const accountIdToUse = selectedBucket.accountId || parsedAccountId;
    
    // Force a full page reload with the new bucket - this is the most reliable way
    // to ensure we get fresh data without any caching issues
    const url = new URL(window.location.href);
    url.pathname = '/browser';
    url.search = `?account=${accountIdToUse}&bucket=${selectedBucket.Name}&t=${Date.now()}`;
    
    // Use direct assignment to location.href for a complete page refresh
    window.location.href = url.toString();
  }, [parsedAccountId]);
  
  // Hook for fetching buckets in selected account (if any)
  const { 
    data: buckets = [], 
    isLoading: isLoadingBuckets
  } = useS3Buckets(parsedAccountId, !bucket);
  
  // Hook for listing objects in selected bucket
  const { 
    data: objectsData,
    isLoading: isLoadingObjects,
    refetch: refetchObjects
  } = useS3Objects(parsedAccountId, bucket, prefix, !!bucket);
  
  // Hook for file operations
  const { 
    deleteFile, 
    downloadFile, 
    batchDownload,
    batchDelete,
    batchMove,
    batchCopy,
    isDeleting, 
    isDownloading, 
    isBatchDownloading,
    isBatchDeleting,
    isBatchMoving,
    isBatchCopying
  } = useS3FileOperations(parsedAccountId);
  
  // Fetch account information to check for default bucket
  const { 
    data: accounts = [],
    isLoading: isLoadingAccounts
  } = useQuery<S3Account[]>({
    queryKey: ['/api/s3-accounts'],
    enabled: parsedAccountId !== undefined && !bucket
  });
  
  // Handle toggling selection mode
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Clear all selections when exiting selection mode
      setSelectedFiles({});
    }
  }, [selectionMode]);
  
  // Handle selecting/deselecting a file
  const handleFileSelection = useCallback((file: S3Object, selected: boolean) => {
    if (!file.Key) return;
    
    setSelectedFiles(prev => {
      const newSelection = { ...prev };
      if (selected) {
        newSelection[file.Key!] = file;
      } else {
        delete newSelection[file.Key!];
      }
      return newSelection;
    });
  }, []);
  
  // Handle selecting all files
  const selectAllFiles = useCallback(() => {
    const allFiles = filteredFiles.reduce((acc, file) => {
      if (file.Key) {
        acc[file.Key] = file;
      }
      return acc;
    }, {} as Record<string, S3Object>);
    
    setSelectedFiles(allFiles);
  }, [filteredFiles]);
  
  // Handle clearing selection
  const clearSelection = useCallback(() => {
    setSelectedFiles({});
  }, []);
  
  // Get all buckets from all accounts
  const { 
    data: allBuckets = [], 
    isLoading: isLoadingAllBuckets 
  } = useAllS3Buckets();
  
  // Process objects data for filtering and sorting
  useEffect(() => {
    if (!objectsData) {
      setFilteredFiles([]);
      setFilteredFolders([]);
      return;
    }
    
    let files = [...objectsData.objects];
    let folders = [...objectsData.folders];
    
    // Apply search filter if query exists
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      files = files.filter(file => 
        file.Key?.toLowerCase().includes(query)
      );
      folders = folders.filter(folder => 
        folder.Prefix?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'name':
        files.sort((a, b) => (a.Key || '').localeCompare(b.Key || ''));
        folders.sort((a, b) => (a.Prefix || '').localeCompare(b.Prefix || ''));
        break;
      case 'size':
        files.sort((a, b) => (a.Size || 0) - (b.Size || 0));
        break;
      case 'modified':
        files.sort((a, b) => {
          const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
          const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
          return dateB - dateA;
        });
        break;
      default:
        break;
    }
    
    setFilteredFiles(files);
    setFilteredFolders(folders);
  }, [objectsData, searchQuery, sortBy]);
  
  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);
  
  // Handle batch operations
  const handleBatchMove = useCallback(() => {
    setCurrentBatchOperation("move");
    setIsBatchMoveOpen(true);
  }, []);
  
  const handleBatchCopy = useCallback(() => {
    setCurrentBatchOperation("copy");
    setIsBatchCopyOpen(true);
  }, []);
  
  const handleBatchMoveConfirm = useCallback(async (destinationBucket: string, destinationPrefix: string) => {
    if (!parsedAccountId) return;
    
    const selectedKeys = Object.keys(selectedFiles);
    if (selectedKeys.length === 0) return;
    
    try {
      await batchMove(bucket, selectedKeys, destinationBucket, destinationPrefix);
      notify({ 
        title: "Files moved successfully", 
        description: `Moved ${selectedKeys.length} files to ${destinationBucket}/${destinationPrefix}` 
      });
      setSelectedFiles({});
      setSelectionMode(false);
      refetchObjects();
    } catch (error) {
      console.error("Error moving files:", error);
      notify({ 
        title: "Failed to move files", 
        description: "An error occurred during the batch move operation", 
        variant: "destructive" 
      });
    }
  }, [parsedAccountId, bucket, selectedFiles, batchMove, notify, refetchObjects]);
  
  const handleBatchCopyConfirm = useCallback(async (destinationBucket: string, destinationPrefix: string) => {
    if (!parsedAccountId) return;
    
    const selectedKeys = Object.keys(selectedFiles);
    if (selectedKeys.length === 0) return;
    
    try {
      await batchCopy(bucket, selectedKeys, destinationBucket, destinationPrefix);
      notify({ 
        title: "Files copied successfully", 
        description: `Copied ${selectedKeys.length} files to ${destinationBucket}/${destinationPrefix}` 
      });
    } catch (error) {
      console.error("Error copying files:", error);
      notify({ 
        title: "Failed to copy files", 
        description: "An error occurred during the batch copy operation", 
        variant: "destructive" 
      });
    }
  }, [parsedAccountId, bucket, selectedFiles, batchCopy, notify]);
  
  const handleBatchDownload = useCallback(async () => {
    if (!parsedAccountId) return;
    
    const selectedKeys = Object.keys(selectedFiles);
    if (selectedKeys.length === 0) return;
    
    try {
      await batchDownload(bucket, selectedKeys);
      notify({ 
        title: "Download started", 
        description: `Downloading ${selectedKeys.length} files` 
      });
    } catch (error) {
      console.error("Error downloading files:", error);
      notify({ 
        title: "Failed to download files", 
        description: "An error occurred during the download operation", 
        variant: "destructive" 
      });
    }
  }, [parsedAccountId, bucket, selectedFiles, batchDownload, notify]);
  
  const handleBatchDelete = useCallback(async () => {
    if (!parsedAccountId) return;
    
    const selectedKeys = Object.keys(selectedFiles);
    if (selectedKeys.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedKeys.length} files? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await batchDelete(bucket, selectedKeys);
      notify({ 
        title: "Files deleted successfully", 
        description: `Deleted ${selectedKeys.length} files` 
      });
      setSelectedFiles({});
      setSelectionMode(false);
      refetchObjects();
    } catch (error) {
      console.error("Error deleting files:", error);
      notify({ 
        title: "Failed to delete files", 
        description: "An error occurred during the delete operation", 
        variant: "destructive" 
      });
    }
  }, [parsedAccountId, bucket, selectedFiles, batchDelete, notify, refetchObjects]);
  
  // Return loading state
  if (isLoadingBuckets || isLoadingAccounts) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="flex flex-col items-center">
            <div className="animate-spin text-primary mb-4">
              <svg className="h-12 w-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p>Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  // If we have an account selected but no bucket selected, check for a default bucket
  if (!bucket && parsedAccountId) {
    // Find the account to see if it has a default bucket
    const account = accounts.find(a => a.id === parsedAccountId);
    
    // If the account has a default bucket, automatically navigate to it
    if (account && account.defaultBucket) {
      if (DEBUG) {
        console.log(`Account ${parsedAccountId} has default bucket ${account.defaultBucket}, redirecting...`);
      }
      
      // Use setTimeout to avoid rendering issues
      setTimeout(() => {
        navigateTo({
          account: parsedAccountId,
          bucket: account.defaultBucket
        });
      }, 0);
      
      // Show loading while redirecting
      return (
        <Layout>
          <div className="flex items-center justify-center h-[70vh]">
            <div className="flex flex-col items-center">
              <div className="animate-spin text-primary mb-4">
                <svg className="h-12 w-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p>Loading default bucket...</p>
            </div>
          </div>
        </Layout>
      );
    }
    
    // If no default bucket, show bucket selection
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Your S3 Buckets</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Only show buckets for the selected account */}
            {allBuckets
              .filter(bucket => bucket.accountId === parsedAccountId)
              .map((bucket, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center justify-center gap-4 hover:bg-muted"
                  onClick={() => handleSelectBucket(bucket)}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <svg className="h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <span className="text-lg font-medium">{bucket.Name}</span>
                    <span className="text-xs text-muted-foreground">{bucket.accountName} • {bucket.region}</span>
                  </div>
                </Button>
              ))}
          </div>
          
          {allBuckets.filter(b => b.accountId === parsedAccountId).length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No buckets found for this account.</p>
              <Button 
                className="mt-4"
                onClick={() => navigate('/account-manager')}
              >
                Manage Accounts
              </Button>
            </div>
          )}
        </div>
      </Layout>
    );
  }
  
  // If there's no account selected at all, redirect to the dashboard
  if (!parsedAccountId && !bucket) {
    navigate('/dashboard');
    return null;
  }
  
  // Return file browser if bucket is selected
  return (
    <Layout>
      <div className="space-y-6">
        {/* Breadcrumbs for navigation */}
        <div className="flex items-center justify-between">
          <Breadcrumbs 
            accountId={parsedAccountId!} 
            bucket={bucket} 
            prefix={prefix} 
          />
          <StorageStats account={accounts.find(a => a.id === parsedAccountId)} />
        </div>
        
        {/* File actions toolbar */}
        <FileActions
          title={`Browsing ${bucket}`}
          bucket={bucket}
          prefix={prefix}
          accountId={parsedAccountId!}
          viewMode={viewMode}
          onViewModeChange={(newMode) => {
            setViewMode(newMode);
            updateViewModeMutation.mutate(newMode);
          }}
          sortBy={sortBy}
          onSortChange={setSortBy}
          selectionMode={selectionMode}
          selectedCount={Object.keys(selectedFiles).length}
          onToggleSelectionMode={toggleSelectionMode}
          onBatchDownload={handleBatchDownload}
          onBatchDelete={handleBatchDelete}
          onBatchMove={handleBatchMove}
          onBatchCopy={handleBatchCopy}
          onSelectAll={selectAllFiles}
          onClearSelection={clearSelection}
          onSearch={handleSearch}
          onUpload={() => setIsUploadOpen(true)}
        />
        
        {/* Content area for files and folders */}
        <div className="relative min-h-[300px]">
          {/* Loading indicator */}
          {isLoadingObjects && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
              <div className="animate-spin text-primary">
                <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          )}
          
          {/* Parent directory button */}
          {prefix && (
            <div className={viewMode === 'grid' ? 'mb-6' : 'mb-2'}>
              <Button
                variant="outline"
                className="w-full md:w-auto flex items-center gap-2"
                onClick={handleNavigateUp}
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Parent Directory</span>
              </Button>
            </div>
          )}
          
          {/* Grid or list of folders and files */}
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' 
            : 'space-y-2'
          }>
            {/* Folders */}
            {filteredFolders.map((folder, index) => (
              <FolderCard
                key={index}
                folder={folder}
                accountId={parsedAccountId!}
                bucket={bucket}
                prefix={prefix}
                viewMode={viewMode}
                onClick={() => handleFolderClick(folder)}
              />
            ))}
            
            {/* Files */}
            {filteredFiles.map((file, index) => (
              <FileCard
                key={index}
                file={file}
                bucket={bucket}
                accountId={parsedAccountId!}
                prefix={prefix}
                selectable={selectionMode}
                selected={!!selectedFiles[file.Key || '']}
                onSelect={(file, selected) => handleFileSelection(file, selected)}
                viewMode={viewMode}
                onDelete={() => {
                  if (!file.Key) return;
                  setFileToDelete(file.Key);
                  setIsDeleteConfirmOpen(true);
                }}
                onDownload={async () => {
                  if (!file.Key) return;
                  try {
                    await downloadFile(bucket, file.Key);
                  } catch (error) {
                    notify({ 
                      title: "Download failed", 
                      description: "Failed to download file",
                      variant: "destructive"
                    });
                  }
                }}
                onShare={() => {
                  if (!file.Key) return;
                  // Set the file to share and open the share dialog
                  setShareFile({
                    accountId: parsedAccountId!,
                    bucket: bucket,
                    path: file.Key,
                    filename: file.Key.split('/').pop() || file.Key,
                    contentType: file.contentType,
                    size: file.Size || 0
                  });
                  setIsShareOpen(true);
                }}
                onRename={() => {
                  if (!file.Key) return;
                  // Alert user that rename is coming soon
                  notify({
                    title: "Rename feature",
                    description: "File rename functionality will be available soon"
                  });
                }}
              />
            ))}
            
            {/* Empty state */}
            {filteredFiles.length === 0 && filteredFolders.length === 0 && !isLoadingObjects && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">This folder is empty</p>
                <Button 
                  className="mt-4"
                  onClick={() => setIsUploadOpen(true)}
                >
                  Upload Files
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Upload dialog */}
      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        bucket={bucket}
        prefix={prefix}
        accountId={parsedAccountId!}
      />
      
      {/* Batch move dialog */}
      <BatchOperationDialog
        open={isBatchMoveOpen}
        onOpenChange={setIsBatchMoveOpen}
        operationType="move"
        sourceBucket={bucket}
        selectedCount={Object.keys(selectedFiles).length}
        onConfirm={handleBatchMoveConfirm}
        isProcessing={isBatchMoving}
      />
      
      {/* Batch copy dialog */}
      <BatchOperationDialog
        open={isBatchCopyOpen}
        onOpenChange={setIsBatchCopyOpen}
        operationType="copy"
        sourceBucket={bucket}
        selectedCount={Object.keys(selectedFiles).length}
        onConfirm={handleBatchCopyConfirm}
        isProcessing={isBatchCopying}
      />
      
      {/* Share file dialog */}
      {isShareOpen && (
        <ShareDialog
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          file={shareFile}
        />
      )}
      

      
      {/* Delete confirmation dialog */}
      {isDeleteConfirmOpen && (
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the file. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!fileToDelete) return;
                  try {
                    await deleteFile(bucket, fileToDelete);
                    notify({
                      title: "File deleted",
                      description: `Successfully deleted file`
                    });
                    refetchObjects();
                  } catch (error) {
                    notify({
                      title: "Delete failed",
                      description: "Failed to delete file",
                      variant: "destructive"
                    });
                  }
                  setIsDeleteConfirmOpen(false);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Layout>
  );
}
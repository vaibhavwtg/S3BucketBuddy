import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Breadcrumbs } from "@/components/files/Breadcrumbs";
import { FileActions } from "@/components/files/FileActions";
import { FileCard } from "@/components/files/FileCard";
import { FolderCard } from "@/components/files/FolderCard";
import { StorageStats } from "@/components/files/StorageStats";
import { Button } from "@/components/ui/button";
import { useS3Buckets, useS3Objects, useS3FileOperations, useAllS3Buckets } from "@/hooks/use-s3";
import { S3Bucket, S3Object, S3CommonPrefix, S3Account } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { UploadDialog } from "@/components/dialogs/UploadDialog";
import { BatchOperationDialog } from "@/components/dialogs/BatchOperationDialog";

export default function Browser() {
  const [location, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast: notify } = useToast();
  
  // Check if user is authenticated and redirect if not
  useEffect(() => {
    console.log("Authentication state in browser:", { isAuthenticated, user, authLoading });
    
    if (!authLoading && !isAuthenticated) {
      console.log("User not authenticated, redirecting to login");
      // Use toast from component scope
      notify({
        title: "Authentication Required",
        description: "Please log in to access your S3 buckets",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate, user, notify]);
  
  // Get parameters from URL query string
  const searchParams = new URLSearchParams(window.location.search);
  const accountId = searchParams.get('account');
  const bucketParam = searchParams.get('bucket');
  const prefix = searchParams.get('prefix') || "";
  
  // Convert null to undefined for bucket parameter
  const bucket: string | undefined = bucketParam ?? undefined;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>("name");
  const [filteredFiles, setFilteredFiles] = useState<S3Object[]>([]);
  const [filteredFolders, setFilteredFolders] = useState<S3CommonPrefix[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, S3Object>>({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);
  const [isBatchCopyOpen, setIsBatchCopyOpen] = useState(false);
  const [currentBatchOperation, setCurrentBatchOperation] = useState<"move" | "copy">("move");

  // Parse accountId to number
  const parsedAccountId = accountId ? parseInt(accountId) : undefined;
  
  // Helper function to navigate with query params
  const navigateTo = (params: { account?: string | number, bucket?: string, prefix?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.account) queryParams.set('account', params.account.toString());
    if (params.bucket) queryParams.set('bucket', params.bucket);
    if (params.prefix) queryParams.set('prefix', params.prefix);
    navigate(`/browser?${queryParams.toString()}`);
  };

  // Initialize S3 file operations
  const { 
    batchDeleteFiles, 
    downloadFiles,
    batchCopyFiles,
    batchMoveFiles,
    isBatchDeleting,
    isBatchCopying,
    isBatchMoving
  } = useS3FileOperations(parsedAccountId);

  // Fetch account information to get the default bucket
  const { 
    data: accounts = [],
    isLoading: isLoadingAccounts
  } = useQuery<S3Account[]>({
    queryKey: ['/api/s3-accounts'],
    enabled: parsedAccountId !== undefined && !bucket
  });
  
  // Handle toggling selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Clear all selections when exiting selection mode
      setSelectedFiles({});
    }
  };
  
  // Handle selecting/deselecting a file
  const handleFileSelection = (file: S3Object, selected: boolean) => {
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
  };
  
  // Handle selecting all files
  const selectAllFiles = () => {
    const allFiles = filteredFiles.reduce((acc, file) => {
      if (file.Key) {
        acc[file.Key] = file;
      }
      return acc;
    }, {} as Record<string, S3Object>);
    
    setSelectedFiles(allFiles);
  };
  
  // Handle clearing selection
  const clearSelection = () => {
    setSelectedFiles({});
  };
  
  // Handle batch download
  const handleBatchDownload = () => {
    const selectedKeys = Object.keys(selectedFiles);
    if (selectedKeys.length === 0 || !bucket) return;
    
    downloadFiles(bucket, selectedKeys);
  };
  
  // Handle batch delete
  const handleBatchDelete = () => {
    const selectedKeys = Object.keys(selectedFiles);
    if (selectedKeys.length === 0 || !bucket) return;
    
    const confirmMessage = selectedKeys.length === 1 
      ? "Are you sure you want to delete this file?" 
      : `Are you sure you want to delete these ${selectedKeys.length} files?`;
    
    if (confirm(confirmMessage)) {
      batchDeleteFiles(bucket, selectedKeys);
      setSelectedFiles({});
    }
  };
  
  // Handle batch move dialog
  const handleOpenBatchMove = () => {
    setCurrentBatchOperation("move");
    setIsBatchMoveOpen(true);
  };
  
  // Handle batch copy dialog
  const handleOpenBatchCopy = () => {
    setCurrentBatchOperation("copy");
    setIsBatchCopyOpen(true);
  };
  
  // Handle batch move confirmation
  const handleConfirmBatchMove = (destinationBucket: string, destinationPrefix: string) => {
    const selectedKeys = Object.keys(selectedFiles);
    if (selectedKeys.length === 0 || !bucket) return;
    
    // Execute batch move operation
    batchMoveFiles(bucket, selectedKeys, destinationBucket, destinationPrefix);
    
    // Close dialog after operation is started
    setIsBatchMoveOpen(false);
    
    // Clear selection if moving to a different bucket or folder
    if (destinationBucket !== bucket || destinationPrefix !== prefix) {
      setSelectedFiles({});
    }
  };
  
  // Handle batch copy confirmation
  const handleConfirmBatchCopy = (destinationBucket: string, destinationPrefix: string) => {
    const selectedKeys = Object.keys(selectedFiles);
    if (selectedKeys.length === 0 || !bucket) return;
    
    // Execute batch copy operation
    batchCopyFiles(bucket, selectedKeys, destinationBucket, destinationPrefix);
    
    // Close dialog after operation is started
    setIsBatchCopyOpen(false);
  };

  // Find the current account
  const currentAccount = accounts.find(acc => acc.id === parsedAccountId);

  // Redirect to default bucket if we have an account with a default bucket but no bucket selected
  useEffect(() => {
    if (parsedAccountId && currentAccount && currentAccount.defaultBucket && !bucket) {
      navigateTo({
        account: parsedAccountId,
        bucket: currentAccount.defaultBucket
      });
    }
  }, [currentAccount, parsedAccountId, bucket]);

  // Fetch buckets for the account
  const { 
    data: buckets = [], 
    isLoading: isLoadingBuckets 
  } = useS3Buckets(parsedAccountId);

  // If no bucket is selected, show bucket selection
  const isBucketSelection = !bucket;

  // Clean the prefix param to ensure it ends with a /
  const cleanPrefix = prefix ? 
    (prefix.endsWith("/") ? prefix : `${prefix}/`) : 
    "";

  // Fetch objects for the selected bucket and prefix
  const { 
    data: objectsData, 
    isLoading: isLoadingObjects,
    isError: hasError,
    error: objectsError
  } = useS3Objects(
    parsedAccountId,
    bucket || undefined, // Convert null to undefined
    cleanPrefix,
    !isBucketSelection && !!bucket // Enable only when we have a bucket
  ) as { 
    data: any; 
    isLoading: boolean; 
    isError: boolean; 
    error: Error | null | unknown; 
  };

  // Update filtered files when data changes or search query changes
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
      const lowerQuery = searchQuery.toLowerCase();
      files = files.filter(file => 
        file.Key?.toLowerCase().includes(lowerQuery)
      );
      folders = folders.filter(folder => 
        folder.Prefix?.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "name":
        files.sort((a, b) => (a.Key || "").localeCompare(b.Key || ""));
        folders.sort((a, b) => (a.Prefix || "").localeCompare(b.Prefix || ""));
        break;
      case "size":
        files.sort((a, b) => (b.Size || 0) - (a.Size || 0));
        break;
      case "date":
        files.sort((a, b) => {
          const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
          const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case "type":
        files.sort((a, b) => {
          const typeA = a.Key?.split('.').pop() || "";
          const typeB = b.Key?.split('.').pop() || "";
          return typeA.localeCompare(typeB);
        });
        break;
    }

    setFilteredFiles(files);
    setFilteredFolders(folders);
  }, [objectsData, searchQuery, sortBy]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Handle bucket selection
  const handleSelectBucket = (bucket: S3Bucket) => {
    if (!bucket.Name) return;
    navigateTo({
      account: parsedAccountId,
      bucket: bucket.Name
    });
  };

  // Return loading state
  if (isLoadingBuckets || isLoadingAccounts) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="flex flex-col items-center">
            <div className="animate-spin text-primary mb-4">
              <i className="ri-loader-4-line text-4xl"></i>
            </div>
            <p>Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Get all buckets from all accounts
  const { 
    data: allBuckets = [], 
    isLoading: isLoadingAllBuckets 
  } = useAllS3Buckets();

  // Return bucket selection showing all buckets directly if no bucket is selected
  if (isBucketSelection) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Your S3 Buckets</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allBuckets.map((bucket, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-6 flex flex-col items-center justify-center gap-4 hover:bg-muted"
                onClick={() => {
                  if (!bucket.Name) return;
                  navigateTo({
                    account: bucket.accountId,
                    bucket: bucket.Name
                  });
                }}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <i className="ri-bucket-line text-4xl text-primary"></i>
                  <span className="text-lg font-medium">{bucket.Name}</span>
                  <span className="text-xs text-muted-foreground">{bucket.accountName} • {bucket.region}</span>
                </div>
              </Button>
            ))}
            {!isLoadingAllBuckets && allBuckets.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-12 border rounded-lg border-dashed">
                <i className="ri-information-line text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-lg font-medium mb-2">No Buckets Found</h3>
                <p className="text-center text-muted-foreground mb-4">
                  No S3 buckets found across your accounts, or your IAM users don't have permission to list them.
                </p>
                <Button onClick={() => navigate("/account-manager")}>
                  Manage S3 Accounts
                </Button>
              </div>
            )}
            {isLoadingAllBuckets && (
              <div className="col-span-full flex flex-col items-center justify-center p-12">
                <div className="animate-spin text-primary mb-4">
                  <i className="ri-loader-4-line text-4xl"></i>
                </div>
                <p>Loading buckets from all accounts...</p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // Return error state
  if (hasError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <i className="ri-error-warning-line text-5xl text-destructive mb-4"></i>
          <h2 className="text-xl font-bold mb-2">Error loading bucket contents</h2>
          <p className="text-muted-foreground mb-6">
            {objectsError && typeof objectsError === 'object' && 'message' in objectsError 
              ? (objectsError as Error).message 
              : "Something went wrong"}
          </p>
          <Button onClick={() => navigateTo({ account: parsedAccountId })}>
            Back to Buckets
          </Button>
        </div>
      </Layout>
    );
  }

  // Get folder name from prefix for title
  const folderName = cleanPrefix 
    ? cleanPrefix.split('/').filter(Boolean).pop() || bucket 
    : bucket;
    
  // Show loading state if auth is still loading
  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // If not authenticated, don't render anything (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout
      currentPath={cleanPrefix}
      currentBucket={bucket}
      onSearch={handleSearch}
      showUploadButton={true}
    >
      {/* Breadcrumbs */}
      <Breadcrumbs
        accountId={parsedAccountId || 0}
        bucket={bucket}
        prefix={cleanPrefix}
      />

      {/* Storage Statistics */}
      <StorageStats account={currentAccount} />

      {/* File actions */}
      <FileActions
        title={folderName || "My Files"}
        bucket={bucket}
        prefix={cleanPrefix}
        accountId={parsedAccountId || 0}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortChange={setSortBy}
        selectionMode={selectionMode}
        selectedCount={Object.keys(selectedFiles).length}
        onToggleSelectionMode={toggleSelectionMode}
        onBatchDownload={handleBatchDownload}
        onBatchDelete={handleBatchDelete}
        onSelectAll={selectAllFiles}
        onClearSelection={clearSelection}
      />

      {/* Loading state */}
      {isLoadingObjects && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center">
            <div className="animate-spin text-primary mb-4">
              <i className="ri-loader-4-line text-4xl"></i>
            </div>
            <p>Loading files...</p>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="flex items-center justify-center py-12">
          <div className="bg-destructive/10 text-destructive rounded-lg p-6 max-w-lg w-full text-center">
            <div className="mb-4">
              <i className="ri-error-warning-line text-4xl"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Files</h3>
            <p className="mb-4">
              {objectsError && typeof objectsError === 'object' && 'message' in objectsError
                ? (objectsError as Error).message 
                : "There was a problem loading your files. The bucket might be in a different region than configured."}
            </p>
            <div className="flex justify-center space-x-4 flex-wrap gap-2">
              <Button onClick={() => navigate(`/browser/${parsedAccountId}`)}>
                Select Another Bucket
              </Button>
              <Button variant="outline" onClick={() => navigate("/manage-accounts")}>
                Manage Accounts
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* No files or folders */}
      {!isLoadingObjects && 
       filteredFiles.length === 0 && 
       filteredFolders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 bg-muted/30 rounded-lg mt-2">
          {searchQuery ? (
            <>
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <i className="ri-search-line text-2xl text-muted-foreground"></i>
              </div>
              <h3 className="text-lg font-medium mb-1">No matching files</h3>
              <p className="text-center text-muted-foreground mb-3 max-w-md">
                No files or folders match your search query: "{searchQuery}"
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <i className="ri-folder-open-line text-2xl text-muted-foreground"></i>
              </div>
              <h3 className="text-lg font-medium mb-1">This folder is empty</h3>
              <p className="text-center text-muted-foreground mb-3 max-w-md">
                Upload files or create a new folder to get started
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsUploadOpen(true)}
              >
                Upload Files
              </Button>
            </>
          )}
        </div>
      )}

      {/* Folders Section */}
      {!isLoadingObjects && filteredFolders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-4">Folders</h2>
          <div className={`grid ${viewMode === 'grid' 
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8' 
            : 'grid-cols-1'} ${viewMode === 'grid' ? 'gap-3' : 'gap-2'}`}
          >
            {filteredFolders.map((folder, index) => (
              <FolderCard
                key={index}
                folder={folder}
                accountId={parsedAccountId || 0}
                bucket={bucket}
                prefix={cleanPrefix}
                viewMode={viewMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      {!isLoadingObjects && filteredFiles.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-4">Files</h2>
          <div className={`grid ${viewMode === 'grid' 
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8' 
            : 'grid-cols-1'} ${viewMode === 'grid' ? 'gap-3' : 'gap-2'}`}
          >
            {filteredFiles.map((file, index) => (
              <FileCard
                key={index}
                file={file}
                bucket={bucket}
                accountId={parsedAccountId || 0}
                prefix={cleanPrefix}
                selectable={selectionMode}
                selected={Boolean(file.Key && selectedFiles[file.Key])}
                onSelect={handleFileSelection}
                viewMode={viewMode}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Upload Dialog */}
      {bucket && parsedAccountId && (
        <UploadDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          bucket={bucket}
          prefix={cleanPrefix}
          accountId={parsedAccountId}
        />
      )}
      
      {/* Batch Move Dialog */}
      {bucket && parsedAccountId && (
        <BatchOperationDialog
          open={isBatchMoveOpen}
          onOpenChange={setIsBatchMoveOpen}
          operationType="move"
          sourceBucket={bucket}
          selectedCount={Object.keys(selectedFiles).length}
          onConfirm={handleConfirmBatchMove}
          isProcessing={isBatchMoving}
        />
      )}
      
      {/* Batch Copy Dialog */}
      {bucket && parsedAccountId && (
        <BatchOperationDialog
          open={isBatchCopyOpen}
          onOpenChange={setIsBatchCopyOpen}
          operationType="copy"
          sourceBucket={bucket}
          selectedCount={Object.keys(selectedFiles).length}
          onConfirm={handleConfirmBatchCopy}
          isProcessing={isBatchCopying}
        />
      )}
    </Layout>
  );
}

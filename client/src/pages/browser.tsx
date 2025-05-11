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
import { useS3Buckets, useS3Objects } from "@/hooks/use-s3";
import { S3Bucket, S3Object, S3CommonPrefix } from "@/lib/types";

export default function Browser() {
  const { accountId, bucket, prefix = "" } = useParams();
  const [_, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>("name");
  const [filteredFiles, setFilteredFiles] = useState<S3Object[]>([]);
  const [filteredFolders, setFilteredFolders] = useState<S3CommonPrefix[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Parse accountId to number
  const parsedAccountId = accountId ? parseInt(accountId) : undefined;

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
    error
  } = useS3Objects(
    parsedAccountId,
    bucket,
    cleanPrefix,
    !isBucketSelection
  );

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
    navigate(`/browser/${accountId}/${bucket.Name}`);
  };

  // Return loading state
  if (isLoadingBuckets) {
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

  // Return bucket selection if no bucket is selected
  if (isBucketSelection) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Select a Bucket</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buckets.map((bucket, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-6 flex flex-col items-center justify-center gap-4 hover:bg-muted"
                onClick={() => handleSelectBucket(bucket)}
              >
                <i className="ri-bucket-line text-4xl text-primary"></i>
                <span className="text-lg font-medium">{bucket.Name}</span>
              </Button>
            ))}
            {buckets.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-12 border rounded-lg border-dashed">
                <i className="ri-information-line text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-lg font-medium mb-2">No Buckets Found</h3>
                <p className="text-center text-muted-foreground mb-4">
                  This AWS account doesn't have any S3 buckets, or your IAM user doesn't have permission to list them.
                </p>
                <Button onClick={() => navigate("/settings")}>
                  Manage S3 Accounts
                </Button>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // Return error state
  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <i className="ri-error-warning-line text-5xl text-destructive mb-4"></i>
          <h2 className="text-xl font-bold mb-2">Error loading bucket contents</h2>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error ? error.message : "Something went wrong"}
          </p>
          <Button onClick={() => navigate(`/browser/${accountId}`)}>
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
      <StorageStats />

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

      {/* No files or folders */}
      {!isLoadingObjects && 
       filteredFiles.length === 0 && 
       filteredFolders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border rounded-lg border-dashed">
          <i className="ri-folder-2-line text-5xl text-muted-foreground mb-4"></i>
          {searchQuery ? (
            <>
              <h3 className="text-lg font-medium mb-2">No matching files</h3>
              <p className="text-center text-muted-foreground">
                No files or folders match your search query: "{searchQuery}"
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium mb-2">This folder is empty</h3>
              <p className="text-center text-muted-foreground mb-4">
                Upload files or create a new folder to get started
              </p>
            </>
          )}
        </div>
      )}

      {/* Folders Section */}
      {!isLoadingObjects && filteredFolders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-4">Folders</h2>
          <div className={`grid ${viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1'} gap-4`}
          >
            {filteredFolders.map((folder, index) => (
              <FolderCard
                key={index}
                folder={folder}
                accountId={parsedAccountId || 0}
                bucket={bucket}
                prefix={cleanPrefix}
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
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1'} gap-4`}
          >
            {filteredFiles.map((file, index) => (
              <FileCard
                key={index}
                file={file}
                bucket={bucket}
                accountId={parsedAccountId || 0}
                prefix={cleanPrefix}
              />
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}

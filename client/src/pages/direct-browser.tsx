import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileIcon, FolderIcon, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// This is a simplified browser that directly uses the API
export default function DirectBrowser() {
  const params = useParams<{ accountId: string }>();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // State
  const [currentPrefix, setCurrentPrefix] = useState("");
  
  // Parse the account ID from URL
  const accountId = params.accountId ? parseInt(params.accountId, 10) : undefined;
  
  // Current bucket (for demo simplicity we'll use a default bucket)
  const [currentBucket, setCurrentBucket] = useState<string | null>(null);
  
  // Check if user is authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access your files",
        variant: "destructive",
      });
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate, toast]);
  
  // Fetch available buckets
  const { data: buckets = [], isLoading: isLoadingBuckets } = useQuery({
    queryKey: [`/api/s3/${accountId}/buckets`],
    enabled: isAuthenticated && !!accountId,
  });
  
  // Fetch objects for the selected bucket and prefix
  const { data: objectsData, isLoading: isLoadingObjects } = useQuery({
    queryKey: [`/api/s3/${accountId}/objects`, currentBucket, currentPrefix],
    enabled: isAuthenticated && !!accountId && !!currentBucket,
  });
  
  // Select a bucket
  const handleSelectBucket = (bucketName: string) => {
    setCurrentBucket(bucketName);
    setCurrentPrefix("");
  };
  
  // Navigate to a folder
  const handleOpenFolder = (prefix: string) => {
    setCurrentPrefix(prefix);
  };
  
  // Navigate up a level
  const handleNavigateUp = () => {
    // Remove trailing slash
    const trimmedPrefix = currentPrefix.endsWith('/') 
      ? currentPrefix.slice(0, -1) 
      : currentPrefix;
    
    // Split path
    const parts = trimmedPrefix.split('/');
    
    // Remove last part (current folder)
    parts.pop();
    
    // Join remaining parts
    const parentPrefix = parts.length > 0 ? `${parts.join('/')}/` : '';
    
    setCurrentPrefix(parentPrefix);
  };
  
  // Render loading state
  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[70vh]">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      </Layout>
    );
  }
  
  // Bucket selection screen
  if (!currentBucket) {
    return (
      <Layout>
        <div className="container py-6">
          <h1 className="text-2xl font-bold mb-6">Select a Bucket</h1>
          
          {isLoadingBuckets ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buckets.map((bucket: any) => (
                <Card 
                  key={bucket.Name} 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSelectBucket(bucket.Name)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{bucket.Name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Region: {bucket.region || "unknown"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Layout>
    );
  }
  
  // File browser
  return (
    <Layout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{currentBucket}</h1>
            <div className="flex items-center text-sm text-muted-foreground">
              <span>Path: {currentPrefix || "/"}</span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleNavigateUp}
            disabled={!currentPrefix}
          >
            <ChevronUp className="h-4 w-4 mr-1" /> Up
          </Button>
        </div>
        
        {/* Content area */}
        {isLoadingObjects ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Folders */}
            {objectsData?.folders?.map((folder: any) => (
              <Card 
                key={folder.Prefix} 
                className="cursor-pointer hover:bg-muted"
                onClick={() => handleOpenFolder(folder.Prefix)}
              >
                <CardContent className="p-4 flex items-center">
                  <FolderIcon className="h-6 w-6 mr-3 text-blue-500" />
                  <span>{folder.Prefix.split('/').filter(Boolean).pop()}/</span>
                </CardContent>
              </Card>
            ))}
            
            {/* Files */}
            {objectsData?.objects?.map((file: any) => {
              // Skip files that are actually the current folder prefix
              if (currentPrefix && file.Key === currentPrefix) return null;
              
              // Get the filename without the prefix
              const filename = file.Key.replace(currentPrefix, '');
              
              // Skip if this is not a file in the current folder
              if (filename.includes('/')) return null;
              
              return (
                <Card key={file.Key} className="hover:bg-muted">
                  <CardContent className="p-4 flex items-center">
                    <FileIcon className="h-6 w-6 mr-3 text-gray-500" />
                    <div className="truncate">
                      <div className="truncate">{filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(file.Size)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Empty state */}
            {(!objectsData?.folders?.length && !objectsData?.objects?.length) && (
              <div className="col-span-full py-10 text-center text-muted-foreground">
                This folder is empty
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
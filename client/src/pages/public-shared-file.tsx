import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes, formatDate, getFileIcon, getFileColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SharedFileAccess } from "@/lib/types";

export default function PublicSharedFile() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);
  const [directS3Url, setDirectS3Url] = useState<string | null>(null);

  // Fetch shared file details
  const { 
    data: sharedFile, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<SharedFileAccess>({
    queryKey: [`/api/shared/${token}`],
    queryFn: async () => {
      try {
        const res = await apiRequest(
          "GET", 
          `/api/shared/${token}${password ? `?password=${password}` : ""}`
        );
        const data = await res.json();
        
        // Store the direct S3 URL if it exists
        if (data.directS3Url) {
          setDirectS3Url(data.directS3Url);
        }
        
        return data;
      } catch (error: any) {
        // Check if password is required
        if (error.status === 401 && error.data?.passwordRequired) {
          setIsPasswordRequired(true);
          throw new Error("Password required");
        }
        
        // Special handling for expired links 
        if (error.status === 403) {
          const errorObj = new Error("This shared link has expired");
          (errorObj as any).status = 403;
          throw errorObj;
        }
        
        throw error;
      }
    },
    retry: false,
  });
  
  // Effect to track failed downloads and offer fallback
  useEffect(() => {
    if (useFallbackUrl && directS3Url) {
      window.open(directS3Url, '_blank');
      setUseFallbackUrl(false);
    }
  }, [useFallbackUrl, directS3Url]);

  // Check password mutation
  const passwordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("GET", `/api/shared/${token}?password=${password}`);
      return res.json();
    },
    onSuccess: (data) => {
      // Update query data and hide password input
      refetch();
      setIsPasswordRequired(false);
    },
    onError: (error) => {
      toast({
        title: "Invalid password",
        description: "The password you entered is incorrect",
        variant: "destructive",
      });
    },
  });

  // Handle password submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    passwordMutation.mutate(password);
  };

  // Handle download with fallback to direct S3 URL
  const handleDownload = () => {
    if (!sharedFile?.signedUrl) return;
    
    try {
      // Create a temporary link and click it to start the download
      const link = document.createElement("a");
      link.href = sharedFile.signedUrl;
      link.setAttribute("download", sharedFile.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Your file will download shortly",
      });
    } catch (error) {
      console.error("Download error:", error);
      // If the signed URL fails, offer to try the direct S3 URL
      if (directS3Url) {
        toast({
          title: "Download error",
          description: "We're trying an alternative download method for you.",
          variant: "destructive",
        });
        setUseFallbackUrl(true);
      } else {
        toast({
          title: "Download failed",
          description: "Unable to download the file. Please try again later.",
          variant: "destructive",
        });
      }
    }
  };

  // If password is required, show password input
  if (isPasswordRequired) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-muted/40">
        <div className="flex items-center mb-8">
          <i className="ri-cloud-line text-primary text-3xl mr-2"></i>
          <h1 className="text-2xl font-bold">WickedFiles</h1>
        </div>
        
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">Protected File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <i className="ri-lock-line text-3xl text-primary"></i>
              </div>
              <p className="text-muted-foreground mb-4">
                This file is password protected. Please enter the password to access it.
              </p>
            </div>
            
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!password || passwordMutation.isPending}
                >
                  {passwordMutation.isPending ? "Checking..." : "Access File"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-muted/40">
        <div className="flex items-center mb-8">
          <i className="ri-cloud-line text-primary text-3xl mr-2"></i>
          <h1 className="text-2xl font-bold">WickedFiles</h1>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="animate-spin text-primary mb-4">
            <i className="ri-loader-4-line text-4xl"></i>
          </div>
          <p>Loading shared file...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !sharedFile) {
    // Determine the specific error message based on the error status
    let errorTitle = "File Not Available";
    let errorMessage = "The file you're looking for is no longer available or has expired.";
    let errorIcon = "ri-error-warning-line";
    let additionalMessage = "Please contact the person who shared this file with you.";
    
    // Check specific error codes for more accurate messages
    if ((error as any)?.status === 403) {
      errorTitle = "Link Expired";
      errorMessage = "This shared link has been manually expired by the owner.";
      errorIcon = "ri-time-line";
    }
    
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-muted/40">
        <div className="flex items-center mb-8">
          <i className="ri-cloud-line text-primary text-3xl mr-2"></i>
          <h1 className="text-2xl font-bold">WickedFiles</h1>
        </div>
        
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-destructive">{errorTitle}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <i className={`${errorIcon} text-3xl text-destructive`}></i>
            </div>
            <p className="text-muted-foreground mb-2">
              {errorMessage}
            </p>
            <p className="text-sm text-muted-foreground">
              {additionalMessage}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get file icon and color
  const fileIcon = getFileIcon(sharedFile.contentType);
  const fileColor = getFileColor(sharedFile.contentType);

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-muted/40">
      <div className="flex items-center mb-8">
        <i className="ri-cloud-line text-primary text-3xl mr-2"></i>
        <h1 className="text-2xl font-bold">WickedFiles</h1>
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold">Shared File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center mb-6">
            <div className={`text-${fileColor} mb-4`}>
              <i className={`ri-${fileIcon} text-6xl`}></i>
            </div>
            <h2 className="text-lg font-semibold mb-1">{sharedFile.filename}</h2>
            <p className="text-sm text-muted-foreground mb-2">
              {formatBytes(sharedFile.filesize)}
              {sharedFile.contentType && ` • ${sharedFile.contentType.split('/')[1]?.toUpperCase() || 'File'}`}
            </p>
            
            {sharedFile.expiresAt && (
              <div className="text-xs text-muted-foreground mt-2">
                Available until: {formatDate(sharedFile.expiresAt)}
              </div>
            )}
          </div>
          
          {!sharedFile.allowDownload ? (
            <div className="bg-muted p-4 rounded-lg mb-4 text-center">
              <p className="text-sm">
                This file is only available for viewing. Downloads are not allowed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button 
                onClick={handleDownload} 
                className="w-full"
              >
                <i className="ri-download-line mr-2"></i>
                Download File
              </Button>
              
              {/* Direct S3 URL option as fallback */}
              {directS3Url && (
                <div className="text-xs text-center text-muted-foreground">
                  Having trouble downloading?{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs underline"
                    onClick={() => {
                      if (directS3Url) {
                        window.open(directS3Url, '_blank');
                        toast({
                          title: "Alternative download",
                          description: "Using direct S3 access for this file",
                        });
                      }
                    }}
                  >
                    Try direct download
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-center text-muted-foreground">
            Shared via WickedFiles • Secure file sharing
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

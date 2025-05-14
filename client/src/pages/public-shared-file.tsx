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
        return data;
      } catch (error: any) {
        // Check if password is required
        if (error.status === 401 && error.data?.passwordRequired) {
          setIsPasswordRequired(true);
          throw new Error("Password required");
        }
        throw error;
      }
    },
    retry: false,
  });

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

  // Handle download
  const handleDownload = () => {
    if (!sharedFile?.signedUrl) return;
    
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
  };

  // If password is required, show password input
  if (isPasswordRequired) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-muted/40">
        <div className="flex items-center mb-8">
          <i className="ri-cloud-line text-primary text-3xl mr-2"></i>
          <h1 className="text-2xl font-bold">CloudStore</h1>
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
          <h1 className="text-2xl font-bold">CloudStore</h1>
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
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-muted/40">
        <div className="flex items-center mb-8">
          <i className="ri-cloud-line text-primary text-3xl mr-2"></i>
          <h1 className="text-2xl font-bold">CloudStore</h1>
        </div>
        
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-destructive">File Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <i className="ri-error-warning-line text-3xl text-destructive"></i>
            </div>
            <p className="text-muted-foreground mb-2">
              The file you're looking for is no longer available or has expired.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact the person who shared this file with you.
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
        <h1 className="text-2xl font-bold">CloudStore</h1>
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
            <Button 
              onClick={handleDownload} 
              className="w-full"
            >
              <i className="ri-download-line mr-2"></i>
              Download File
            </Button>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-center text-muted-foreground">
            Shared via CloudStore • Secure file sharing
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

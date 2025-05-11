import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { 
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBytes, formatDate, getFileIcon, getFileColor } from "@/lib/utils";
import { SharedFile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function SharedFiles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch shared files
  const { data: sharedFiles = [], isLoading } = useQuery<SharedFile[]>({
    queryKey: ['/api/shared-files'],
  });

  // Filter files based on search term
  const filteredFiles = sharedFiles.filter(file => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return (
      file.filename.toLowerCase().includes(lowerSearchTerm) ||
      file.bucket.toLowerCase().includes(lowerSearchTerm) ||
      file.path.toLowerCase().includes(lowerSearchTerm)
    );
  });

  // Copy share link to clipboard
  const copyShareLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    });
  };

  // Delete shared file mutation
  const deleteShareMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/shared-files/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Share deleted",
        description: "The shared file has been removed",
      });
      
      // Refresh shared files list
      queryClient.invalidateQueries({ queryKey: ['/api/shared-files'] });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete shared file",
        variant: "destructive",
      });
    },
  });

  const handleDeleteShare = (id: number) => {
    if (confirm("Are you sure you want to delete this shared file?")) {
      deleteShareMutation.mutate(id);
    }
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Shared Files</h1>
        
        <div className="flex items-center justify-between">
          <div className="max-w-sm flex-1">
            <Input
              placeholder="Search shared files..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full"
            />
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Your Shared Files</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center">
                  <div className="animate-spin text-primary mb-4">
                    <i className="ri-loader-4-line text-4xl"></i>
                  </div>
                  <p>Loading shared files...</p>
                </div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border rounded-lg border-dashed">
                <i className="ri-share-line text-5xl text-muted-foreground mb-4"></i>
                {searchTerm ? (
                  <>
                    <h3 className="text-lg font-medium mb-2">No matching shared files</h3>
                    <p className="text-center text-muted-foreground">
                      No shared files match your search term: "{searchTerm}"
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium mb-2">No shared files yet</h3>
                    <p className="text-center text-muted-foreground">
                      You haven't shared any files yet. Share files by clicking the share button.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map((file) => {
                      const fileIcon = getFileIcon(file.contentType);
                      const fileColor = getFileColor(file.contentType);
                      const isExpired = file.expiresAt 
                        ? new Date(file.expiresAt) < new Date() 
                        : false;
                        
                      return (
                        <TableRow key={file.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <i className={`ri-${fileIcon} text-xl ${fileColor} mr-2`}></i>
                              <div>
                                <div className="font-medium">{file.filename}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatBytes(file.filesize)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{file.bucket}</div>
                              <div className="text-muted-foreground truncate max-w-[200px]">
                                {file.path}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {file.expiresAt ? (
                              <Badge variant={isExpired ? "destructive" : "secondary"}>
                                {isExpired ? "Expired" : formatDate(file.expiresAt)}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Never</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDate(file.createdAt)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <i className="ri-more-2-line"></i>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => copyShareLink(file.shareUrl || "")}>
                                  <i className="ri-clipboard-line mr-2"></i>
                                  Copy Link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteShare(file.id)}>
                                  <i className="ri-delete-bin-line mr-2"></i>
                                  Delete Share
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

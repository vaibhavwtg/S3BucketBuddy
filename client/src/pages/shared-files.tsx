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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatBytes, formatDate, getFileIcon, getFileColor } from "@/lib/utils";
import { SharedFile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileAccessLogs } from "@/components/files/FileAccessLogs";

export default function SharedFiles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"createdAt" | "filename" | "expiresAt" | "accessCount">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "expired">("all");

  // Fetch shared files
  const { data: sharedFiles = [], isLoading } = useQuery<SharedFile[]>({
    queryKey: ['/api/shared-files'],
  });

  // Filter files based on search term and status
  const filteredFiles = sharedFiles.filter(file => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const matchesSearch = (
      file.filename.toLowerCase().includes(lowerSearchTerm) ||
      file.bucket.toLowerCase().includes(lowerSearchTerm) ||
      file.path.toLowerCase().includes(lowerSearchTerm)
    );
    
    // Apply status filter
    if (filterStatus === "all") {
      return matchesSearch;
    }
    
    const isExpired = file.expiresAt ? new Date(file.expiresAt) < new Date() : false;
    
    if (filterStatus === "expired" && isExpired) {
      return matchesSearch;
    }
    
    if (filterStatus === "active" && !isExpired) {
      return matchesSearch;
    }
    
    return false;
  })
  // Apply sorting
  .sort((a, b) => {
    // Helper to handle empty or null values
    const compareValues = (valueA: any, valueB: any, isAsc: boolean) => {
      // Handle undefined/null values
      if (valueA === undefined || valueA === null) return isAsc ? -1 : 1;
      if (valueB === undefined || valueB === null) return isAsc ? 1 : -1;
      
      // For dates, convert strings to Date objects
      if (valueA instanceof Date || typeof valueA === 'string' && !isNaN(Date.parse(valueA))) {
        const dateA = valueA instanceof Date ? valueA : new Date(valueA);
        const dateB = valueB instanceof Date ? valueB : new Date(valueB);
        return isAsc ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      }
      
      // For strings
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return isAsc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }
      
      // For numbers
      return isAsc ? valueA - valueB : valueB - valueA;
    };
    
    const isAsc = sortDirection === 'asc';
    
    switch (sortField) {
      case 'filename':
        return compareValues(a.filename, b.filename, isAsc);
      case 'expiresAt':
        return compareValues(a.expiresAt, b.expiresAt, isAsc);
      case 'accessCount':
        return compareValues(a.accessCount || 0, b.accessCount || 0, isAsc);
      case 'createdAt':
      default:
        return compareValues(a.createdAt, b.createdAt, isAsc);
    }
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
        
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="max-w-sm flex-1 w-full md:w-auto">
            <Input
              placeholder="Search shared files..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {/* Filter Status */}
            <div className="flex gap-1 border rounded-md p-1">
              <Button 
                size="sm" 
                variant={filterStatus === "all" ? "default" : "ghost"}
                onClick={() => setFilterStatus("all")}
              >
                All
              </Button>
              <Button 
                size="sm" 
                variant={filterStatus === "active" ? "default" : "ghost"}
                onClick={() => setFilterStatus("active")}
              >
                Active
              </Button>
              <Button 
                size="sm" 
                variant={filterStatus === "expired" ? "default" : "ghost"}
                onClick={() => setFilterStatus("expired")}
              >
                Expired
              </Button>
            </div>
            
            {/* Sort Controls */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <i className={`ri-sort-${sortDirection === "asc" ? "asc" : "desc"} text-sm`}></i>
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortField("createdAt")}>
                  {sortField === "createdAt" && "✓ "}Date Created
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortField("filename")}>
                  {sortField === "filename" && "✓ "}Filename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortField("expiresAt")}>
                  {sortField === "expiresAt" && "✓ "}Expiration Date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortField("accessCount")}>
                  {sortField === "accessCount" && "✓ "}Access Count
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}>
                  <i className={`ri-sort-${sortDirection === "asc" ? "asc" : "desc"} mr-2`}></i>
                  {sortDirection === "asc" ? "Ascending" : "Descending"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                      <TableHead>Access</TableHead>
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
                            <FileAccessLogs 
                              fileId={file.id} 
                              filename={file.filename}
                              accessCount={file.accessCount || 0}
                            />
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <i className="ri-more-2-line"></i>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => copyShareLink(`${window.location.origin}/shared/${file.shareToken}`)}>
                                  <i className="ri-clipboard-line mr-2"></i>
                                  Copy App Link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copyShareLink(`https://${file.bucket}.s3.amazonaws.com/${file.path}`)}>
                                  <i className="ri-aws-fill mr-2"></i>
                                  Copy Direct S3 Link
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
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

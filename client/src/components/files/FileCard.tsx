import { S3Object } from "@/lib/types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate, getFileIcon, getFileColor, getFileTypeLabel } from "@/lib/utils";
import { useState } from "react";
import { 
  useQuery, 
  useQueryClient, 
  useMutation 
} from "@tanstack/react-query";
import { getDownloadUrl, deleteObject } from "@/lib/s3";
import { useToast } from "@/hooks/use-toast";
import { ShareDialog } from "@/components/dialogs/ShareDialog";
import { Checkbox } from "@/components/ui/checkbox";

interface FileCardProps {
  file: S3Object;
  bucket: string;
  accountId: number;
  prefix: string;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (file: S3Object, selected: boolean) => void;
  viewMode?: 'grid' | 'list';
}

export function FileCard({ 
  file, 
  bucket, 
  accountId, 
  prefix,
  selectable = false,
  selected = false,
  onSelect,
  viewMode = 'grid'
}: FileCardProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDownload = async () => {
    try {
      if (!file.Key) return;
      
      const signedUrl = await getDownloadUrl(accountId, bucket, file.Key);
      
      // Create a temporary link and click it to start the download
      const link = document.createElement("a");
      link.href = signedUrl;
      link.setAttribute("download", file.Key.split("/").pop() || "download");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Your file will download shortly",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to generate download link",
        variant: "destructive",
      });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!file.Key) return;
      return deleteObject(accountId, bucket, file.Key);
    },
    onSuccess: () => {
      toast({
        title: "File deleted",
        description: "File has been deleted successfully",
      });
      
      // Invalidate the objects query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: [`/api/s3/${accountId}/objects`] 
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this file?")) {
      deleteMutation.mutate();
    }
  };

  // Extract the filename from the key
  const filename = file.Key?.split("/").pop() || "Unknown file";
  
  // Infer the file type from the key
  const contentType = filename.includes('.') ? 
    `application/${filename.split('.').pop()}` : 
    "application/octet-stream";
  
  const fileIcon = getFileIcon(contentType, false, filename);
  const fileColor = getFileColor(contentType, false, filename);
  const fileType = getFileTypeLabel(contentType, filename);

  const handleSelectionChange = (checked: boolean) => {
    if (onSelect && file.Key) {
      onSelect(file, checked);
    }
  };

  return (
    <Card className={`group hover:shadow-md transition-all duration-200 ${selected ? 'ring-2 ring-primary' : ''} h-full overflow-hidden`}>
      {viewMode === 'grid' ? (
        <>
          {/* Grid View */}
          <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
            <i className={`ri-${fileIcon} text-5xl ${fileColor}`}></i>
            
            {selectable && (
              <div className="absolute top-2 left-2 z-10">
                <Checkbox 
                  checked={selected} 
                  onCheckedChange={handleSelectionChange}
                  className="h-4 w-4 border-2 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </div>
            )}
            
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex space-x-2">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="bg-white/20 text-white hover:bg-white/30 rounded-full h-8 w-8"
                  onClick={handleDownload}
                >
                  <i className="ri-download-line"></i>
                  <span className="sr-only">Download</span>
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="bg-white/20 text-white hover:bg-white/30 rounded-full h-8 w-8"
                  onClick={() => setIsShareOpen(true)}
                >
                  <i className="ri-share-line"></i>
                  <span className="sr-only">Share</span>
                </Button>
              </div>
            </div>
          </div>
          
          <CardContent className="p-3">
            <div>
              <h3 className="font-medium text-card-foreground truncate text-sm" title={filename}>
                {filename}
              </h3>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.Size || 0)}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-muted-foreground h-6 w-6">
                      <i className="ri-more-2-fill text-sm"></i>
                      <span className="sr-only">Options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleDownload}>
                      <i className="ri-download-line mr-2"></i>
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsShareOpen(true)}>
                      <i className="ri-share-line mr-2"></i>
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <i className="ri-delete-bin-line mr-2"></i>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </>
      ) : (
        // List View
        <div className="p-2 flex items-center gap-3">
          {selectable && (
            <Checkbox 
              checked={selected} 
              onCheckedChange={handleSelectionChange}
              className="h-4 w-4 border-2 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
          )}
          
          <div className="flex items-center justify-center h-10 w-10 bg-muted rounded">
            <i className={`ri-${fileIcon} text-xl ${fileColor}`}></i>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-card-foreground truncate text-sm" title={filename}>
              {filename}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatBytes(file.Size || 0)}</span>
              <span>•</span>
              <span>{formatDate(file.LastModified || new Date())}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7"
              onClick={handleDownload}
            >
              <i className="ri-download-line"></i>
              <span className="sr-only">Download</span>
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7"
              onClick={() => setIsShareOpen(true)}
            >
              <i className="ri-share-line"></i>
              <span className="sr-only">Share</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground">
                  <i className="ri-more-2-fill"></i>
                  <span className="sr-only">Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleDownload}>
                  <i className="ri-download-line mr-2"></i>
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsShareOpen(true)}>
                  <i className="ri-share-line mr-2"></i>
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <i className="ri-delete-bin-line mr-2"></i>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
      
      {/* Share Dialog */}
      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        file={{
          accountId,
          bucket,
          path: file.Key || "",
          filename,
          contentType,
          size: file.Size || 0,
        }}
      />
    </Card>
  );
}

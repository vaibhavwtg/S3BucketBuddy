import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/s3";
import { useQueryClient } from "@tanstack/react-query";
import { FileUploadProgress } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: string;
  prefix?: string;
  accountId: number;
}

export function UploadDialog({ open, onOpenChange, bucket, prefix = "", accountId }: UploadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      setFiles(fileList);
      
      // Initialize progress for each file
      setUploadProgress(
        fileList.map(file => ({
          filename: file.name,
          progress: 0,
          status: "pending"
        }))
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files);
      setFiles(fileList);
      
      // Initialize progress for each file
      setUploadProgress(
        fileList.map(file => ({
          filename: file.name,
          progress: 0,
          status: "pending"
        }))
      );
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      const uploadPromises = files.map(async (file, index) => {
        try {
          // Update progress as the file uploads
          const updateProgress = (progress: FileUploadProgress) => {
            setUploadProgress(prev => {
              const newProgress = [...prev];
              newProgress[index] = progress;
              return newProgress;
            });
          };
          
          // Start upload with progress
          updateProgress({
            filename: file.name,
            progress: 0,
            status: "uploading"
          });
          
          // Upload the file
          await uploadFile(
            accountId, 
            bucket, 
            file, 
            prefix,
            updateProgress
          );
          
          // Mark as completed
          updateProgress({
            filename: file.name,
            progress: 100,
            status: "completed"
          });
          
        } catch (error) {
          // Handle individual file upload error
          setUploadProgress(prev => {
            const newProgress = [...prev];
            newProgress[index] = {
              filename: file.name,
              progress: 0,
              status: "error",
              error: error instanceof Error ? error.message : "Upload failed"
            };
            return newProgress;
          });
          
          throw error;
        }
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Invalidate the objects query to refresh the list
      queryClient.invalidateQueries({ 
        queryKey: [`/api/s3/${accountId}/objects`, bucket, prefix] 
      });
      
      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${files.length} file(s)`,
      });
      
      // Close the dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
        setFiles([]);
        setUploadProgress([]);
      }, 1500);
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Some files failed to upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload files to your S3 bucket.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6">
          <div 
            className="border-2 border-dashed border-border rounded-lg p-6 text-center"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <i className="ri-upload-cloud-2-line text-4xl text-muted-foreground mb-2"></i>
            <p className="text-muted-foreground mb-2">Drag and drop files here, or click to browse</p>
            <p className="text-xs text-muted-foreground">Maximum file size: 100MB</p>
            <input 
              type="file" 
              className="hidden" 
              multiple 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Browse Files
            </Button>
          </div>
          
          {/* Selected files */}
          {files.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-medium">Selected Files ({files.length})</h3>
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {files.map((file, index) => {
                  const progress = uploadProgress[index];
                  return (
                    <div key={index} className="text-sm bg-muted p-3 rounded-md">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                      </div>
                      {progress && (
                        <div className="space-y-1">
                          <Progress value={progress.progress} className="h-2" />
                          <div className="flex justify-between items-center text-xs">
                            <span>
                              {progress.status === "pending" && "Pending"}
                              {progress.status === "uploading" && "Uploading..."}
                              {progress.status === "completed" && "Completed"}
                              {progress.status === "error" && "Failed"}
                            </span>
                            <span>{progress.progress}%</span>
                          </div>
                          {progress.status === "error" && (
                            <p className="text-xs text-destructive">{progress.error}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Destination</label>
            <Select defaultValue={bucket}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={bucket}>{`${bucket}${prefix ? `/${prefix}` : ''}`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

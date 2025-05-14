import { S3CommonPrefix } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { getFileIcon, getFileColor } from "@/lib/utils";

interface FolderCardProps {
  folder: S3CommonPrefix;
  accountId: number;
  bucket: string;
  prefix: string;
  viewMode?: 'grid' | 'list';
  onClick?: () => void;
}

export function FolderCard({ folder, accountId, bucket, prefix, viewMode = 'grid', onClick }: FolderCardProps) {
  const [_, navigate] = useLocation();

  // Extract folder name from the prefix
  const folderKey = folder.Prefix || "";
  const folderName = folderKey.split("/").filter(Boolean).pop() || "Unknown folder";

  const handleClick = () => {
    if (onClick) {
      // Use the provided onClick handler if available
      onClick();
    } else {
      // Default navigation behavior if no onClick provided
      const params = new URLSearchParams();
      params.set('account', accountId.toString());
      params.set('bucket', bucket);
      params.set('prefix', folderKey);
      
      navigate(`/browser?${params.toString()}`);
    }
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200 h-full overflow-hidden cursor-pointer" onClick={handleClick}>
      {viewMode === 'grid' ? (
        <>
          {/* Grid View */}
          <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
            <i className={`ri-${getFileIcon(undefined, true)} text-5xl ${getFileColor(undefined, true)}`}></i>
            
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                size="sm" 
                variant="ghost" 
                className="bg-white/20 text-white hover:bg-white/30 rounded-full h-8 w-8"
              >
                <i className="ri-folder-open-line"></i>
                <span className="sr-only">Open</span>
              </Button>
            </div>
          </div>
          
          <CardContent className="p-3">
            <div>
              <h3 className="font-medium text-card-foreground truncate text-sm" title={folderName}>
                {folderName}
              </h3>
              <p className="text-xs text-muted-foreground">
                Folder
              </p>
            </div>
          </CardContent>
        </>
      ) : (
        // List View
        <div className="p-2 flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 bg-muted rounded">
            <i className={`ri-${getFileIcon(undefined, true)} text-xl ${getFileColor(undefined, true)}`}></i>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-card-foreground truncate text-sm" title={folderName}>
              {folderName}
            </h3>
            <p className="text-xs text-muted-foreground">
              Folder
            </p>
          </div>
          
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground">
            <i className="ri-folder-open-line"></i>
            <span className="sr-only">Open</span>
          </Button>
        </div>
      )}
    </Card>
  );
}

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
}

export function FolderCard({ folder, accountId, bucket, prefix }: FolderCardProps) {
  const [_, navigate] = useLocation();

  // Extract folder name from the prefix
  const folderKey = folder.Prefix || "";
  const folderName = folderKey.split("/").filter(Boolean).pop() || "Unknown folder";

  const handleClick = () => {
    // Create query parameters for navigation
    const params = new URLSearchParams();
    params.set('account', accountId.toString());
    params.set('bucket', bucket);
    params.set('prefix', folderKey);
    
    navigate(`/browser?${params.toString()}`);
  };

  return (
    <Card className="bg-card hover:shadow-md transition duration-200 cursor-pointer" onClick={handleClick}>
      <CardContent className="p-4">
        <div className="flex items-center">
          <i className={`ri-${getFileIcon(undefined, true)} text-4xl ${getFileColor(undefined, true)} mr-3`}></i>
          <div className="flex-1 min-w-0">
            <h3 className="text-card-foreground font-medium truncate">{folderName}</h3>
            <p className="text-sm text-muted-foreground">Folder</p>
          </div>
          <Button size="icon" variant="ghost" className="text-muted-foreground">
            <i className="ri-more-2-fill"></i>
            <span className="sr-only">Options</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

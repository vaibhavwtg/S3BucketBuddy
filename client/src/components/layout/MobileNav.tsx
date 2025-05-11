import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { UploadDialog } from "@/components/dialogs/UploadDialog";

interface MobileNavProps {
  currentBucket?: string;
  currentPath?: string;
}

export function MobileNav({ currentBucket, currentPath }: MobileNavProps) {
  const [location] = useLocation();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const isActive = (path: string) => {
    return location === path || location.startsWith(`${path}/`);
  };

  return (
    <>
      <nav className="md:hidden bg-card border-t border-border fixed bottom-0 left-0 right-0 z-20">
        <div className="flex items-center justify-around py-2">
          <Link href="/">
            <a className={cn(
              "flex flex-col items-center px-3 py-2",
              isActive("/") ? "text-primary" : "text-muted-foreground"
            )}>
              <i className="ri-folder-line text-xl"></i>
              <span className="text-xs mt-1">Files</span>
            </a>
          </Link>
          
          <Link href="/shared">
            <a className={cn(
              "flex flex-col items-center px-3 py-2",
              isActive("/shared") ? "text-primary" : "text-muted-foreground"
            )}>
              <i className="ri-share-line text-xl"></i>
              <span className="text-xs mt-1">Shared</span>
            </a>
          </Link>
          
          <div className="flex flex-col items-center p-2">
            <Button className="w-12 h-12 rounded-full" onClick={() => setIsUploadOpen(true)}>
              <i className="ri-upload-line text-2xl"></i>
            </Button>
          </div>
          
          <Link href="/settings">
            <a className={cn(
              "flex flex-col items-center px-3 py-2",
              isActive("/settings") ? "text-primary" : "text-muted-foreground"
            )}>
              <i className="ri-settings-3-line text-xl"></i>
              <span className="text-xs mt-1">Settings</span>
            </a>
          </Link>
        </div>
      </nav>
      
      {isUploadOpen && currentBucket && (
        <UploadDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          bucket={currentBucket}
          prefix={currentPath || ""}
        />
      )}
    </>
  );
}

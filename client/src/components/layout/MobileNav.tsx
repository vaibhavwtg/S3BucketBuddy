import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { UploadDialog } from "@/components/dialogs/UploadDialog";
import { useQuery } from "@tanstack/react-query";

interface MobileNavProps {
  currentBucket?: string;
  currentPath?: string;
}

export function MobileNav({ currentBucket, currentPath }: MobileNavProps) {
  const [location] = useLocation();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // Get user settings for potentially needed account info
  const { data: userSettings } = useQuery({
    queryKey: ['/api/user-settings'],
  });

  const isActive = (path: string) => {
    return location === path || location.startsWith(`${path}/`);
  };

  // These functions use direct href changes for reliable navigation on mobile
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  return (
    <>
      <nav className="md:hidden bg-card border-t border-border fixed bottom-0 left-0 right-0 z-20 pb-safe">
        <div className="flex items-center justify-around py-2">
          <button 
            onClick={() => navigateTo('/')}
            className={cn(
              "flex flex-col items-center px-2 py-2 focus:outline-none",
              isActive("/") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <i className="ri-dashboard-line text-xl"></i>
            <span className="text-xs mt-0.5">Dashboard</span>
          </button>
          
          <button 
            onClick={() => navigateTo('/account-manager')}
            className={cn(
              "flex flex-col items-center px-2 py-2 focus:outline-none",
              isActive("/account-manager") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <i className="ri-folder-line text-xl"></i>
            <span className="text-xs mt-0.5">Accounts</span>
          </button>
          
          {/* Center action button for upload */}
          <div className="flex flex-col items-center -mt-5">
            <Button 
              variant="default"
              className="w-14 h-14 rounded-full shadow-lg border-4 border-background flex items-center justify-center" 
              onClick={() => currentBucket ? setIsUploadOpen(true) : null}
              disabled={!currentBucket}
            >
              <i className="ri-upload-line text-xl"></i>
            </Button>
            <span className="text-xs mt-1 text-muted-foreground">Upload</span>
          </div>
          
          <button 
            onClick={() => navigateTo('/shared')}
            className={cn(
              "flex flex-col items-center px-2 py-2 focus:outline-none",
              isActive("/shared") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <i className="ri-share-line text-xl"></i>
            <span className="text-xs mt-0.5">Shared</span>
          </button>
          
          <button 
            onClick={() => navigateTo('/settings')}
            className={cn(
              "flex flex-col items-center px-2 py-2 focus:outline-none",
              isActive("/settings") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <i className="ri-settings-3-line text-xl"></i>
            <span className="text-xs mt-0.5">Settings</span>
          </button>
        </div>
      </nav>
      
      {isUploadOpen && currentBucket && (
        <UploadDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          bucket={currentBucket}
          prefix={currentPath || ""}
          accountId={userSettings?.defaultAccountId}
        />
      )}
    </>
  );
}

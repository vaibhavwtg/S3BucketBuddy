import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/ui/theme-provider";
import { UploadDialog } from "@/components/dialogs/UploadDialog";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  currentPath?: string;
  currentBucket?: string;
  onSearch?: (query: string) => void;
  showUploadButton?: boolean;
}

export function Header({ 
  currentPath, 
  currentBucket, 
  onSearch, 
  showUploadButton = true
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch the current user's default account
  const { data: userSettings } = useQuery({
    queryKey: ['/api/user-settings'],
    staleTime: 300000 // 5 minutes
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  // We're using ThemeSelector component directly, so we don't need this function anymore
  // const toggleTheme = () => {
  //   setTheme(theme === "dark" ? "light" : "dark");
  // };

  return (
    <header className="bg-card shadow-sm z-10">
      <div className="flex items-center justify-between p-3 md:p-4">
        {/* Mobile Menu Button - Will open a mobile drawer in future version */}
        <Button variant="ghost" size="icon" className="md:hidden flex-shrink-0">
          <i className="ri-menu-line text-lg md:text-2xl"></i>
          <span className="sr-only">Menu</span>
        </Button>

        {/* Search Bar - Hidden on smaller screens, shown on SM and up */}
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:ml-4 sm:mr-2 sm:max-w-lg">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="ri-search-line text-muted-foreground"></i>
              </div>
              <Input
                type="text"
                className="pl-10 pr-3 h-9"
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2 ml-auto sm:ml-4">
          {showUploadButton && currentBucket && (
            <Button 
              size="sm"
              className="hidden sm:flex items-center" 
              onClick={() => setIsUploadOpen(true)}
            >
              <i className="ri-upload-line mr-1 sm:mr-2"></i>
              <span>Upload</span>
            </Button>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" asChild>
            <Link href="/settings">
              <i className="ri-notification-3-line text-lg sm:text-xl"></i>
              <span className="sr-only">Notifications</span>
            </Link>
          </Button>

          <div className="flex">
            <ThemeSelector />
          </div>
        </div>
      </div>

      {isUploadOpen && currentBucket && userSettings?.defaultAccountId && (
        <UploadDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          bucket={currentBucket}
          prefix={currentPath || ""}
          accountId={userSettings.defaultAccountId}
        />
      )}
    </header>
  );
}

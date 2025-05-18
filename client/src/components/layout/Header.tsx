import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/ui/theme-provider";
import { UploadDialog } from "@/components/dialogs/UploadDialog";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { Link } from "wouter";

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="bg-card shadow-sm z-10">
      <div className="flex items-center justify-between p-4">
        {/* Mobile Menu Button */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <i className="ri-menu-line text-2xl"></i>
          <span className="sr-only">Menu</span>
        </Button>

        {/* Search Bar */}
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:ml-6 sm:max-w-lg">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="ri-search-line text-muted-foreground"></i>
              </div>
              <Input
                type="text"
                className="pl-10 pr-3"
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2 ml-4">
          {showUploadButton && currentBucket && (
            <Button className="hidden sm:flex items-center" onClick={() => setIsUploadOpen(true)}>
              <i className="ri-upload-line mr-2"></i>
              <span>Upload</span>
            </Button>
          )}

          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <i className="ri-notification-3-line text-xl"></i>
              <span className="sr-only">Notifications</span>
            </Link>
          </Button>

          <div className="hidden sm:flex">
            <ThemeSelector />
          </div>
        </div>
      </div>

      {isUploadOpen && currentBucket && (
        <UploadDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          bucket={currentBucket}
          prefix={currentPath || ""}
        />
      )}
    </header>
  );
}

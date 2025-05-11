import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UploadDialog } from "@/components/dialogs/UploadDialog";

interface FileActionsProps {
  title: string;
  bucket: string;
  prefix: string;
  accountId: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function FileActions({
  title,
  bucket,
  prefix,
  accountId,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
}: FileActionsProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      
      <div className="flex flex-wrap items-center gap-2">
        <Button 
          className="sm:hidden flex items-center" 
          onClick={() => setIsUploadOpen(true)}
        >
          <i className="ri-upload-line mr-1.5"></i>
          <span>Upload</span>
        </Button>
        
        <div className="flex space-x-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <i className="ri-folder-add-line"></i>
                <span className="sr-only">New folder</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <i className="ri-folder-add-line mr-2"></i>
                New folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="outline" 
            size="icon"
            className="hidden sm:flex"
            onClick={() => setIsUploadOpen(true)}
          >
            <i className="ri-upload-line"></i>
            <span className="sr-only">Upload</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <i className="ri-more-2-fill"></i>
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsUploadOpen(true)}>
                <i className="ri-upload-line mr-2"></i>
                Upload files
              </DropdownMenuItem>
              <DropdownMenuItem>
                <i className="ri-folder-add-line mr-2"></i>
                New folder
              </DropdownMenuItem>
              <DropdownMenuItem>
                <i className="ri-refresh-line mr-2"></i>
                Refresh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by: Name</SelectItem>
            <SelectItem value="size">Sort by: Size</SelectItem>
            <SelectItem value="date">Sort by: Date</SelectItem>
            <SelectItem value="type">Sort by: Type</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex border border-border rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
            onClick={() => onViewModeChange('list')}
          >
            <i className="ri-list-check-2"></i>
            <span className="sr-only">List view</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
            onClick={() => onViewModeChange('grid')}
          >
            <i className="ri-grid-line"></i>
            <span className="sr-only">Grid view</span>
          </Button>
        </div>
      </div>
      
      <UploadDialog 
        open={isUploadOpen} 
        onOpenChange={setIsUploadOpen} 
        bucket={bucket}
        prefix={prefix}
      />
    </div>
  );
}

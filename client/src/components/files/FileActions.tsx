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
import { ViewModeToggle } from "@/components/files/ViewModeToggle";

interface FileActionsProps {
  title: string;
  bucket: string;
  prefix: string;
  accountId: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  selectionMode: boolean;
  selectedCount: number;
  onToggleSelectionMode: () => void;
  onBatchDownload: () => void;
  onBatchDelete: () => void;
  onBatchMove?: () => void;
  onBatchCopy?: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSearch?: (query: string) => void;
  onUpload?: () => void;
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
  selectionMode = false,
  selectedCount = 0,
  onToggleSelectionMode,
  onBatchDownload,
  onBatchDelete,
  onBatchMove,
  onBatchCopy,
  onSelectAll,
  onClearSelection,
  onSearch,
  onUpload,
}: FileActionsProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
      <div className="flex items-center">
        <h1 className="text-lg sm:text-xl font-semibold truncate">{title}</h1>
        {selectionMode && selectedCount > 0 && (
          <span className="ml-2 sm:ml-3 px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs sm:text-sm">
            {selectedCount} selected
          </span>
        )}
      </div>
      
      {selectionMode ? (
        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
          {/* Mobile-optimized selection buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            className="flex items-center h-8 px-2 sm:px-3"
          >
            <i className="ri-close-line mr-1 sm:mr-1.5"></i>
            <span className="text-xs sm:text-sm">Clear</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            className="flex items-center h-8 px-2 sm:px-3"
          >
            <i className="ri-checkbox-multiple-line mr-1 sm:mr-1.5"></i>
            <span className="text-xs sm:text-sm">All</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onBatchDownload}
            disabled={selectedCount === 0}
            className="flex items-center h-8 px-2 sm:px-3"
          >
            <i className="ri-download-line mr-1 sm:mr-1.5"></i>
            <span className="text-xs sm:text-sm">Download</span>
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={onBatchDelete}
            disabled={selectedCount === 0}
            className="flex items-center h-8 px-2 sm:px-3"
          >
            <i className="ri-delete-bin-line mr-1 sm:mr-1.5"></i>
            <span className="text-xs sm:text-sm">Delete</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedCount === 0}
                className="flex items-center h-8 px-2 sm:px-3"
              >
                <i className="ri-more-2-fill mr-1 sm:mr-1.5"></i>
                <span className="text-xs sm:text-sm">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 sm:w-48">
              <DropdownMenuItem onClick={() => onBatchMove && onBatchMove()}>
                <i className="ri-file-transfer-line mr-2"></i>
                Move Files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBatchCopy && onBatchCopy()}>
                <i className="ri-file-copy-line mr-2"></i>
                Copy Files
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={onToggleSelectionMode}
            className="flex items-center h-8 px-2 sm:px-3 ml-auto sm:ml-0"
          >
            <i className="ri-checkbox-indeterminate-line mr-1 sm:mr-1.5"></i>
            <span className="text-xs sm:text-sm">Done</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-2 sm:mt-0">
          {/* Search input - full width on mobile */}
          {onSearch && (
            <div className="relative col-span-2 sm:col-span-1 sm:mr-2 mb-1 sm:mb-0">
              <input
                type="text"
                placeholder="Search files..."
                className="h-8 sm:h-9 w-full sm:w-40 md:w-48 px-3 py-1 rounded-md border bg-background text-sm"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  onSearch(e.target.value);
                }}
              />
              {searchText && (
                <button 
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSearchText("");
                    onSearch("");
                  }}
                >
                  <i className="ri-close-line"></i>
                </button>
              )}
            </div>
          )}
          
          {/* Main action buttons */}
          <Button 
            size="sm"
            className="flex items-center h-8 px-2 sm:px-3" 
            onClick={onUpload || (() => setIsUploadOpen(true))}
          >
            <i className="ri-upload-line mr-1 sm:mr-1.5"></i>
            <span className="text-xs sm:text-sm">Upload</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleSelectionMode}
            className="flex items-center h-8 px-2 sm:px-3"
          >
            <i className="ri-checkbox-multiple-line mr-1 sm:mr-1.5"></i>
            <span className="text-xs sm:text-sm">Select</span>
          </Button>
          
          {/* View mode toggle */}
          <div className="col-span-1 sm:col-span-auto flex justify-center">
            <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} />
          </div>
          
          {/* More options dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3">
                <i className="ri-more-2-fill mr-1 sm:mr-1.5"></i>
                <span className="text-xs sm:text-sm">More</span>
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
          
          {/* Sort dropdown - shown on a new line on mobile, inline on larger screens */}
          <div className="col-span-2 sm:col-span-auto sm:ml-auto">
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="h-8 text-xs w-full sm:w-[140px] px-2">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="size">Size</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      
      <UploadDialog 
        open={isUploadOpen} 
        onOpenChange={setIsUploadOpen} 
        bucket={bucket}
        prefix={prefix}
        accountId={accountId}
      />
    </div>
  );
}

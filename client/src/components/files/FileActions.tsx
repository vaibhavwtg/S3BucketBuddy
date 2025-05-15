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

export interface FileActionsProps {
  title?: string;
  bucket?: string;
  prefix?: string;
  accountId?: number;
  searchQuery?: string;
  onSearch?: (query: string) => void;
  onUpload?: () => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  selectionMode: boolean;
  selectedCount: number;
  onSelectionModeToggle: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchDownload: () => void;
  onBatchMove?: () => void;
  onBatchCopy?: () => void;
  onBatchDelete: () => void;
  isBatchDownloading?: boolean;
  isBatchDeleting?: boolean;
  isBatchMoving?: boolean;
  isBatchCopying?: boolean;
}

export function FileActions({
  title,
  bucket,
  prefix,
  accountId,
  searchQuery = "",
  onSearch,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  selectionMode = false,
  selectedCount = 0,
  onSelectionModeToggle,
  onBatchDownload,
  onBatchDelete,
  onBatchMove,
  onBatchCopy,
  onSelectAll,
  onClearSelection,
  onUpload,
  isBatchDownloading = false,
  isBatchDeleting = false,
  isBatchMoving = false,
  isBatchCopying = false
}: FileActionsProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchText, setSearchText] = useState(searchQuery);
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold">{title || "Files"}</h1>
        {selectionMode && selectedCount > 0 && (
          <span className="ml-3 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
            {selectedCount} selected
          </span>
        )}
      </div>
      
      {selectionMode ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            className="flex items-center"
          >
            <i className="ri-close-line mr-1.5"></i>
            <span>Clear</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            className="flex items-center"
          >
            <i className="ri-checkbox-multiple-line mr-1.5"></i>
            <span>Select All</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onBatchDownload}
            disabled={selectedCount === 0 || isBatchDownloading}
            className="flex items-center"
          >
            {isBatchDownloading ? (
              <i className="ri-loader-4-line animate-spin mr-1.5"></i>
            ) : (
              <i className="ri-download-line mr-1.5"></i>
            )}
            <span>Download</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedCount === 0 || isBatchMoving || isBatchCopying}
                className="flex items-center"
              >
                <i className="ri-more-2-fill mr-1.5"></i>
                <span>More Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={onBatchMove} 
                disabled={isBatchMoving}
                className="flex items-center"
              >
                {isBatchMoving ? (
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                ) : (
                  <i className="ri-file-transfer-line mr-2"></i>
                )}
                Move Files
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onBatchCopy}
                disabled={isBatchCopying}
                className="flex items-center"
              >
                {isBatchCopying ? (
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                ) : (
                  <i className="ri-file-copy-line mr-2"></i>
                )}
                Copy Files
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={onBatchDelete}
            disabled={selectedCount === 0 || isBatchDeleting}
            className="flex items-center"
          >
            {isBatchDeleting ? (
              <i className="ri-loader-4-line animate-spin mr-1.5"></i>
            ) : (
              <i className="ri-delete-bin-line mr-1.5"></i>
            )}
            <span>Delete</span>
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={onSelectionModeToggle}
            className="flex items-center"
          >
            <i className="ri-checkbox-indeterminate-line mr-1.5"></i>
            <span>Exit Selection</span>
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {/* Search input */}
          {onSearch && (
            <div className="relative mr-2">
              <input
                type="text"
                placeholder="Search files..."
                className="h-9 w-48 px-3 py-1 rounded-md border bg-background text-sm"
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
          
          <Button 
            className="sm:hidden flex items-center" 
            onClick={onUpload || (() => setIsUploadOpen(true))}
          >
            <i className="ri-upload-line mr-1.5"></i>
            <span>Upload</span>
          </Button>
          
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="icon"
              onClick={onSelectionModeToggle}
              title="Select multiple files"
            >
              <i className="ri-checkbox-multiple-line"></i>
              <span className="sr-only">Select Files</span>
            </Button>
            
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
              onClick={onUpload || (() => setIsUploadOpen(true))}
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
              <SelectItem value="modified">Sort by: Date</SelectItem>
              <SelectItem value="type">Sort by: Type</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border border-border rounded-md overflow-hidden shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              className={`px-3 h-9 rounded-none ${viewMode === 'list' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-card hover:bg-muted'}`}
              onClick={() => onViewModeChange('list')}
            >
              <i className="ri-list-check-2 mr-1.5"></i>
              <span>List</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`px-3 h-9 rounded-none ${viewMode === 'grid' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-card hover:bg-muted'}`}
              onClick={() => onViewModeChange('grid')}
            >
              <i className="ri-grid-line mr-1.5"></i>
              <span>Grid</span>
            </Button>
          </div>
        </div>
      )}
      
      {accountId && bucket && (
        <UploadDialog 
          open={isUploadOpen} 
          onOpenChange={setIsUploadOpen} 
          bucket={bucket}
          prefix={prefix || ""}
          accountId={accountId}
        />
      )}
    </div>
  );
}
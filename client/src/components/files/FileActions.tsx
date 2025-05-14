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
  selectionMode: boolean;
  selectedCount: number;
  onToggleSelectionMode: () => void;
  onBatchDownload: () => void;
  onBatchDelete: () => void;
  onBatchMove?: () => void;
  onBatchCopy?: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
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
}: FileActionsProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold">{title}</h1>
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
            disabled={selectedCount === 0}
            className="flex items-center"
          >
            <i className="ri-download-line mr-1.5"></i>
            <span>Download</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedCount === 0}
                className="flex items-center"
              >
                <i className="ri-more-2-fill mr-1.5"></i>
                <span>More Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
            variant="destructive"
            size="sm"
            onClick={onBatchDelete}
            disabled={selectedCount === 0}
            className="flex items-center"
          >
            <i className="ri-delete-bin-line mr-1.5"></i>
            <span>Delete</span>
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={onToggleSelectionMode}
            className="flex items-center"
          >
            <i className="ri-checkbox-indeterminate-line mr-1.5"></i>
            <span>Exit Selection</span>
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            className="sm:hidden flex items-center" 
            onClick={() => setIsUploadOpen(true)}
          >
            <i className="ri-upload-line mr-1.5"></i>
            <span>Upload</span>
          </Button>
          
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleSelectionMode}
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

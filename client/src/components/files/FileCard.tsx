import React from 'react';
import { formatBytes, formatDate } from '@/lib/utils';
import { S3Object } from '@/lib/types';
import { FileIcon } from './FileIcon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Download, Trash, PenSquare, Link, ExternalLink } from 'lucide-react';

interface FileCardProps {
  file: S3Object;
  bucket: string;
  accountId: number;
  prefix: string;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (file: S3Object, selected: boolean) => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onRename?: () => void;
  onShare?: () => void;
  viewMode: 'grid' | 'list';
}

export function FileCard({
  file,
  bucket,
  accountId,
  prefix,
  selectable = false,
  selected = false,
  onSelect,
  onDelete,
  onDownload,
  onRename,
  onShare,
  viewMode,
}: FileCardProps) {
  const { toast } = useToast();
  const fileName = file.Key?.split('/').pop() || '';
  const fileSize = file.Size || 0;
  const lastModified = file.LastModified ? new Date(file.LastModified) : new Date();

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelect) {
      onSelect(file, e.target.checked);
    }
  };

  // For grid view
  if (viewMode === 'grid') {
    return (
      <div
        className={`relative flex flex-col overflow-hidden rounded-lg border bg-card p-2 shadow-sm transition-all hover:shadow ${
          selected ? 'ring-2 ring-primary' : ''
        }`}
      >
        {selectable && (
          <div className="absolute top-2 left-2 z-10">
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelect?.(file, !!checked)}
            />
          </div>
        )}

        <div className="flex flex-col items-center justify-center p-3 sm:p-6 group cursor-pointer" onClick={onDownload}>
          <FileIcon 
            filename={fileName} 
            size="lg" 
            showBackground
            className="mb-2 sm:mb-4 h-12 w-12 sm:h-16 sm:w-16"
          />
          <div className="w-full mt-1 sm:mt-2 text-center space-y-0.5 sm:space-y-1">
            <p className="text-xs sm:text-sm font-medium truncate max-w-full" title={fileName}>
              {fileName}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {formatBytes(fileSize)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-1.5 sm:pt-2 border-t">
          <div className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[80px] sm:max-w-none">
            {formatDate(lastModified)}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7">
                <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px] sm:min-w-[200px]">
              <DropdownMenuItem onClick={onDownload} className="cursor-pointer text-xs sm:text-sm py-1.5">
                <Download className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Download</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare} className="cursor-pointer text-xs sm:text-sm py-1.5">
                <Link className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  const publicUrl = `https://${bucket}.s3.amazonaws.com/${file.Key}`;
                  navigator.clipboard.writeText(publicUrl);
                  toast({
                    title: "Public link copied",
                    description: "Direct S3 URL has been copied to clipboard"
                  });
                }} 
                className="cursor-pointer text-xs sm:text-sm py-1.5"
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Copy Link</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename} className="cursor-pointer text-xs sm:text-sm py-1.5">
                <PenSquare className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive text-xs sm:text-sm py-1.5">
                <Trash className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // For list view
  return (
    <div
      className={`flex items-center justify-between p-1.5 sm:p-2 rounded-md transition-colors hover:bg-muted/40 ${
        selected ? 'bg-muted' : ''
      }`}
    >
      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
        {selectable && (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect?.(file, !!checked)}
            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
          />
        )}
        
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 cursor-pointer" onClick={onDownload}>
          <FileIcon filename={fileName} size="md" className="h-8 w-8 sm:h-10 sm:w-10" />
          
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium truncate" title={fileName}>
              {fileName}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 text-[10px] sm:text-xs text-muted-foreground">
              <span>{formatBytes(fileSize)}</span>
              <span className="hidden sm:inline">•</span>
              <span>{formatDate(lastModified)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons - Reduced for mobile */}
      <div className="flex items-center space-x-0.5 sm:space-x-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex"
          onClick={onDownload}
          title="Download"
        >
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex"
          onClick={onShare}
          title="Share"
        >
          <Link className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        
        {/* Always show dropdown on mobile to save space */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
              <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[150px] sm:min-w-[180px]">
            <DropdownMenuItem onClick={onDownload} className="cursor-pointer text-xs sm:text-sm py-1.5 sm:hidden">
              <Download className="mr-2 h-3.5 w-3.5" />
              <span>Download</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare} className="cursor-pointer text-xs sm:text-sm py-1.5 sm:hidden">
              <Link className="mr-2 h-3.5 w-3.5" />
              <span>Share</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename} className="cursor-pointer text-xs sm:text-sm py-1.5">
              <PenSquare className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                const publicUrl = `https://${bucket}.s3.amazonaws.com/${file.Key}`;
                navigator.clipboard.writeText(publicUrl);
                toast({
                  title: "Public link copied",
                  description: "Direct S3 URL has been copied to clipboard"
                });
              }} 
              className="cursor-pointer text-xs sm:text-sm py-1.5"
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Copy Link</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive text-xs sm:text-sm py-1.5">
              <Trash className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
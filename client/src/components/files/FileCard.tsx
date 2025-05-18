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

        <div className="flex flex-col items-center justify-center p-6 group cursor-pointer" onClick={onDownload}>
          <FileIcon 
            filename={fileName} 
            size="lg" 
            showBackground
            className="mb-4"
          />
          <div className="w-full mt-2 text-center space-y-1">
            <p className="text-sm font-medium truncate max-w-full" title={fileName}>
              {fileName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(fileSize)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            {formatDate(lastModified)}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDownload} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                <span>Download</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare} className="cursor-pointer">
                <Link className="mr-2 h-4 w-4" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  const publicUrl = `https://${bucket}.s3.amazonaws.com/${file.Key}`;
                  navigator.clipboard.writeText(publicUrl);
                  // Use global toast from window object if available
                  const toast = (window as any).toast;
                  if (toast) {
                    toast({
                      title: "Public link copied",
                      description: "Direct S3 URL has been copied to clipboard"
                    });
                  }
                }} 
                className="cursor-pointer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                <span>Copy Public Link</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename} className="cursor-pointer">
                <PenSquare className="mr-2 h-4 w-4" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive">
                <Trash className="mr-2 h-4 w-4" />
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
      className={`flex items-center justify-between p-2 rounded-md transition-colors hover:bg-muted/40 ${
        selected ? 'bg-muted' : ''
      }`}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {selectable && (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect?.(file, !!checked)}
          />
        )}
        
        <div className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer" onClick={onDownload}>
          <FileIcon filename={fileName} size="md" />
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" title={fileName}>
              {fileName}
            </p>
            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
              <span>{formatBytes(fileSize)}</span>
              <span>•</span>
              <span>{formatDate(lastModified)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDownload}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onShare}
          title="Share"
        >
          <Link className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onRename}
          title="Rename"
        >
          <PenSquare className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={onDelete}
          title="Delete"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
import React from 'react';
import { S3CommonPrefix } from '@/lib/types';
import { FileIcon } from './FileIcon';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FolderCardProps {
  folder: S3CommonPrefix;
  bucket: string;
  accountId: number;
  prefix: string;
  viewMode: 'grid' | 'list';
  onClick: () => void;
}

export function FolderCard({
  folder,
  bucket,
  accountId,
  prefix,
  viewMode,
  onClick,
}: FolderCardProps) {
  const folderPath = folder.Prefix || '';
  const folderName = folderPath.split('/').filter(Boolean).pop() || '';
  
  // For grid view
  if (viewMode === 'grid') {
    return (
      <div className="relative flex flex-col overflow-hidden rounded-lg border bg-card p-2 shadow-sm transition-all hover:shadow cursor-pointer" onClick={onClick}>
        <div className="flex flex-col items-center justify-center p-6">
          <FileIcon 
            filename={folderName} 
            isFolder={true}
            size="lg" 
            showBackground
            className="mb-4"
          />
          <div className="w-full mt-2 text-center">
            <p className="text-sm font-medium truncate max-w-full" title={folderName}>
              {folderName}/
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-end mt-auto pt-2 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onClick();
              }} className="cursor-pointer">
                <span>Open folder</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }
  
  // For list view
  return (
    <div className="flex items-center justify-between p-2 rounded-md transition-colors hover:bg-muted/40 cursor-pointer" onClick={onClick}>
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <FileIcon filename={folderName} isFolder={true} size="md" />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={folderName}>
            {folderName}/
          </p>
          <p className="text-xs text-muted-foreground">
            Folder
          </p>
        </div>
      </div>
    </div>
  );
}
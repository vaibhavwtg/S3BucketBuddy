import React from "react";
import { cn } from "@/lib/utils";

// File extension to icon mapping
const FILE_ICONS: Record<string, string> = {
  // Documents
  pdf: "ri-file-pdf-line",
  doc: "ri-file-word-line",
  docx: "ri-file-word-line",
  txt: "ri-file-text-line",
  rtf: "ri-file-text-line",
  odt: "ri-file-text-line",
  
  // Spreadsheets
  xls: "ri-file-excel-line",
  xlsx: "ri-file-excel-line",
  csv: "ri-file-chart-line",
  
  // Presentations
  ppt: "ri-file-ppt-line",
  pptx: "ri-file-ppt-line",
  
  // Images
  jpg: "ri-image-line",
  jpeg: "ri-image-line",
  png: "ri-image-line",
  gif: "ri-file-gif-line",
  svg: "ri-image-line",
  webp: "ri-image-line",
  bmp: "ri-image-line",
  
  // Audio
  mp3: "ri-file-music-line",
  wav: "ri-file-music-line",
  ogg: "ri-file-music-line",
  m4a: "ri-file-music-line",
  
  // Video
  mp4: "ri-video-line",
  mov: "ri-video-line",
  avi: "ri-video-line",
  wmv: "ri-video-line",
  mkv: "ri-video-line",
  webm: "ri-video-line",
  
  // Archives
  zip: "ri-file-zip-line",
  rar: "ri-file-zip-line",
  tar: "ri-file-zip-line",
  "7z": "ri-file-zip-line",
  gz: "ri-file-zip-line",
  
  // Code
  html: "ri-html5-line",
  css: "ri-css3-line",
  js: "ri-javascript-line",
  ts: "ri-file-code-line",
  jsx: "ri-reactjs-line",
  tsx: "ri-reactjs-line",
  json: "ri-code-line",
  xml: "ri-code-line",
  py: "ri-file-code-line",
  php: "ri-file-code-line",
  java: "ri-file-code-line",
  cpp: "ri-file-code-line",
  c: "ri-file-code-line",
  rb: "ri-file-code-line",
  go: "ri-file-code-line",
  rs: "ri-file-code-line",
  sh: "ri-terminal-line",
  md: "ri-markdown-line",
};

// Color mapping for file types
const FILE_COLORS: Record<string, string> = {
  // Documents
  pdf: "text-rose-600",
  doc: "text-blue-600",
  docx: "text-blue-600",
  txt: "text-gray-600",
  rtf: "text-gray-600",
  odt: "text-blue-400",
  
  // Spreadsheets
  xls: "text-green-600",
  xlsx: "text-green-600",
  csv: "text-green-500",
  
  // Presentations
  ppt: "text-orange-600",
  pptx: "text-orange-600",
  
  // Images
  jpg: "text-purple-500",
  jpeg: "text-purple-500",
  png: "text-purple-500",
  gif: "text-purple-600",
  svg: "text-purple-400",
  webp: "text-purple-500",
  bmp: "text-purple-500",
  
  // Audio
  mp3: "text-pink-500",
  wav: "text-pink-600",
  ogg: "text-pink-400",
  m4a: "text-pink-500",
  
  // Video
  mp4: "text-red-500",
  mov: "text-red-600",
  avi: "text-red-600",
  wmv: "text-red-500",
  mkv: "text-red-500",
  webm: "text-red-400",
  
  // Archives
  zip: "text-amber-600",
  rar: "text-amber-700",
  tar: "text-amber-600",
  "7z": "text-amber-500",
  gz: "text-amber-600",
  
  // Code
  html: "text-orange-500",
  css: "text-blue-500",
  js: "text-yellow-500",
  ts: "text-blue-600",
  jsx: "text-sky-500",
  tsx: "text-sky-600",
  json: "text-gray-500",
  xml: "text-gray-600",
  py: "text-blue-500",
  php: "text-purple-600",
  java: "text-red-500",
  cpp: "text-blue-700",
  c: "text-blue-600",
  rb: "text-red-600",
  go: "text-blue-400",
  rs: "text-orange-600",
  sh: "text-gray-700",
  md: "text-gray-500",
};

interface FileIconProps {
  filename: string;
  contentType?: string;
  isFolder?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showBackground?: boolean;
}

export function FileIcon({ 
  filename, 
  contentType, 
  isFolder = false,
  size = 'md',
  className,
  showBackground = false
}: FileIconProps) {
  // Handle folder case
  if (isFolder) {
    return (
      <div className={cn(
        "flex items-center justify-center",
        showBackground && "bg-primary/10 rounded-md",
        getContainerSize(size),
        className
      )}>
        <i className={cn(
          "ri-folder-fill text-primary",
          getIconSize(size)
        )}></i>
      </div>
    );
  }
  
  // Extract extension from filename
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  // Determine icon and color based on extension or content type
  const iconClass = FILE_ICONS[extension] || 'ri-file-line';
  const colorClass = FILE_COLORS[extension] || 'text-muted-foreground';
  
  return (
    <div className={cn(
      "flex items-center justify-center",
      showBackground && "bg-primary/5 rounded-md",
      getContainerSize(size),
      className
    )}>
      <i className={cn(
        iconClass,
        colorClass,
        getIconSize(size)
      )}></i>
    </div>
  );
}

// Helper function to get icon size based on size prop
function getIconSize(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm': return 'text-lg';
    case 'md': return 'text-xl';
    case 'lg': return 'text-3xl';
    default: return 'text-xl';
  }
}

// Helper function to get container size based on size prop
function getContainerSize(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm': return 'w-6 h-6';
    case 'md': return 'w-8 h-8';
    case 'lg': return 'w-12 h-12';
    default: return 'w-8 h-8';
  }
}
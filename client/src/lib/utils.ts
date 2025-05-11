import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getFileIcon(contentType: string | undefined, isFolder: boolean = false, filename: string = "") {
  if (isFolder) return "folder-line";
  
  if (!contentType) {
    // Try to determine from filename extension if contentType is not available
    if (filename) {
      const extension = filename.split('.').pop()?.toLowerCase();
      
      // Images
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) return 'image-line';
      
      // Documents
      if (extension === 'pdf') return 'file-pdf-line';
      if (['doc', 'docx'].includes(extension || '')) return 'file-word-line';
      if (['xls', 'xlsx', 'csv'].includes(extension || '')) return 'file-excel-line';
      if (['ppt', 'pptx'].includes(extension || '')) return 'file-ppt-line';
      if (['txt', 'rtf', 'md'].includes(extension || '')) return 'file-text-line';
      
      // Code files
      if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'swift'].includes(extension || '')) 
        return 'code-line';
      
      // Archives
      if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension || '')) return 'file-zip-line';
      
      // Media
      if (['mp3', 'wav', 'ogg', 'flac'].includes(extension || '')) return 'music-line';
      if (['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'].includes(extension || '')) return 'video-line';
    }
    
    return "file-line";
  }
  
  // Determine icon from content type
  if (contentType.startsWith("image/")) return "image-line";
  if (contentType.startsWith("video/")) return "video-line";
  if (contentType.startsWith("audio/")) return "music-line";
  if (contentType.startsWith("text/")) return "file-text-line";
  
  if (contentType === "application/pdf") return "file-pdf-line";
  if (contentType.includes("spreadsheet") || contentType.includes("excel") || contentType === "application/vnd.ms-excel") return "file-excel-line";
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) return "file-ppt-line";
  if (contentType.includes("document") || contentType.includes("word") || contentType === "application/msword") return "file-word-line";
  if (contentType.includes("code") || contentType.includes("javascript") || contentType.includes("json")) return "code-line";
  
  if (contentType.includes("zip") || contentType.includes("compressed") || contentType.includes("archive") || 
      contentType === "application/x-rar-compressed" || contentType === "application/x-7z-compressed") {
    return "file-zip-line";
  }
  
  return "file-line";
}

export function getFileColor(contentType: string | undefined, isFolder: boolean = false, filename: string = "") {
  if (isFolder) return "text-amber-400";
  
  if (!contentType) {
    // Try to determine from filename extension if contentType is not available
    if (filename) {
      const extension = filename.split('.').pop()?.toLowerCase();
      
      // Images
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) return "text-pink-500";
      
      // Documents
      if (extension === 'pdf') return "text-red-500";
      if (['doc', 'docx'].includes(extension || '')) return "text-blue-600";
      if (['xls', 'xlsx', 'csv'].includes(extension || '')) return "text-emerald-500";
      if (['ppt', 'pptx'].includes(extension || '')) return "text-orange-500";
      if (['txt', 'rtf', 'md'].includes(extension || '')) return "text-slate-600";
      
      // Code files
      if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'swift'].includes(extension || '')) 
        return "text-cyan-600";
      
      // Archives
      if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension || '')) return "text-yellow-600";
      
      // Media
      if (['mp3', 'wav', 'ogg', 'flac'].includes(extension || '')) return "text-blue-500";
      if (['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'].includes(extension || '')) return "text-purple-500";
    }
    
    return "text-slate-400";
  }
  
  // Determine color from content type
  if (contentType.startsWith("image/")) return "text-pink-500";
  if (contentType.startsWith("video/")) return "text-purple-500";
  if (contentType.startsWith("audio/")) return "text-blue-500";
  if (contentType.startsWith("text/")) return "text-slate-600";
  
  if (contentType === "application/pdf") return "text-red-500";
  if (contentType.includes("spreadsheet") || contentType.includes("excel") || contentType === "application/vnd.ms-excel") return "text-emerald-500";
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) return "text-orange-500";
  if (contentType.includes("document") || contentType.includes("word") || contentType === "application/msword") return "text-blue-600";
  if (contentType.includes("code") || contentType.includes("javascript") || contentType.includes("json")) return "text-cyan-600";
  
  if (contentType.includes("zip") || contentType.includes("compressed") || contentType.includes("archive") || 
      contentType === "application/x-rar-compressed" || contentType === "application/x-7z-compressed") {
    return "text-yellow-600";
  }
  
  return "text-slate-400";
}

export function getFileTypeLabel(contentType: string | undefined) {
  if (!contentType) return "File";
  
  if (contentType.startsWith("image/")) return "Image";
  if (contentType.startsWith("video/")) return "Video";
  if (contentType.startsWith("audio/")) return "Audio";
  
  if (contentType === "application/pdf") return "PDF";
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) return "Spreadsheet";
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) return "Presentation";
  if (contentType.includes("document") || contentType.includes("word")) return "Document";
  
  if (contentType.includes("zip") || contentType.includes("compressed") || contentType.includes("archive")) {
    return "Archive";
  }
  
  return "File";
}

export function generateInitials(name: string) {
  if (!name) return "?";
  
  const parts = name.split(" ");
  if (parts.length === 1) {
    return name.substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

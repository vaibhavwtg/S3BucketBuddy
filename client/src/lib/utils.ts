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

export function getFileIcon(contentType: string | undefined, isFolder: boolean = false) {
  if (isFolder) return "folder-line";
  
  if (!contentType) return "file-line";
  
  if (contentType.startsWith("image/")) return "image-line";
  if (contentType.startsWith("video/")) return "video-line";
  if (contentType.startsWith("audio/")) return "music-line";
  
  if (contentType === "application/pdf") return "file-pdf-line";
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) return "file-excel-line";
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) return "file-ppt-line";
  if (contentType.includes("document") || contentType.includes("word")) return "file-word-line";
  
  if (contentType.includes("zip") || contentType.includes("compressed") || contentType.includes("archive")) {
    return "file-zip-line";
  }
  
  return "file-line";
}

export function getFileColor(contentType: string | undefined, isFolder: boolean = false) {
  if (isFolder) return "text-amber-400";
  
  if (!contentType) return "text-slate-400";
  
  if (contentType.startsWith("image/")) return "text-green-500";
  if (contentType.startsWith("video/")) return "text-purple-500";
  if (contentType.startsWith("audio/")) return "text-blue-500";
  
  if (contentType === "application/pdf") return "text-red-500";
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) return "text-emerald-500";
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) return "text-orange-500";
  if (contentType.includes("document") || contentType.includes("word")) return "text-blue-600";
  
  if (contentType.includes("zip") || contentType.includes("compressed") || contentType.includes("archive")) {
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

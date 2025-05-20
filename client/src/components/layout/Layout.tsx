import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  currentPath?: string;
  currentBucket?: string;
  onSearch?: (query: string) => void;
  showUploadButton?: boolean;
}

export function Layout({ 
  children, 
  currentPath, 
  currentBucket, 
  onSearch, 
  showUploadButton 
}: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Hidden on mobile */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden md:ml-64">
        {/* Top Navigation Bar */}
        <Header 
          currentPath={currentPath}
          currentBucket={currentBucket}
          onSearch={onSearch}
          showUploadButton={showUploadButton}
        />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24 md:pb-4 bg-background">
          {children}
        </main>
        
        {/* Mobile Navigation - Extra padding at bottom to prevent content being hidden behind nav */}
        <MobileNav currentBucket={currentBucket} currentPath={currentPath} />
      </div>
    </div>
  );
}

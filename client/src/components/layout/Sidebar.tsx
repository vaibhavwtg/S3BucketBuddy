import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuGroup, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { generateInitials } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
import { S3Account } from "@/lib/types";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  // Fetch user's S3 accounts
  const { data: accounts = [] } = useQuery<S3Account[]>({
    queryKey: ['/api/s3-accounts'],
    enabled: !!user,
  });

  const isActive = (path: string) => {
    return location === path || location.startsWith(`${path}/`);
  };

  return (
    <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 z-20 bg-sidebar-background border-r border-border">
      {/* Logo */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center">
          <i className="ri-cloud-line text-primary text-2xl mr-2"></i>
          <h1 className="text-xl font-semibold">WickedFiles</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <Link href="/">
          <a className={cn(
            "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg",
            isActive("/") ? 
              "text-white bg-primary" : 
              "text-foreground hover:bg-muted"
          )}>
            <i className="ri-dashboard-line mr-3 text-lg"></i>
            <span>Dashboard</span>
          </a>
        </Link>
        <Link href="/shared">
          <a className={cn(
            "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg",
            isActive("/shared") ? 
              "text-white bg-primary" : 
              "text-foreground hover:bg-muted"
          )}>
            <i className="ri-share-line mr-3 text-lg"></i>
            <span>Shared Files</span>
          </a>
        </Link>
        <Link href="/settings">
          <a className={cn(
            "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg",
            isActive("/settings") ? 
              "text-white bg-primary" : 
              "text-foreground hover:bg-muted"
          )}>
            <i className="ri-settings-3-line mr-3 text-lg"></i>
            <span>Settings</span>
          </a>
        </Link>

        {/* My Files Section - Buckets as Folders */}
        <div className="pt-4 mt-4 border-t border-border">
          <h2 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Files</h2>
          <div className="mt-2 space-y-1">
            {accounts
              .filter(account => account.defaultBucket)
              .map((account) => (
                <Link 
                  key={`bucket-${account.id}`} 
                  href={`/browser/${account.id}/${account.defaultBucket}`}
                >
                  <a className={cn(
                    "w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg",
                    isActive(`/browser/${account.id}/${account.defaultBucket}`) ? 
                      "bg-muted text-primary" : 
                      "text-foreground hover:bg-muted"
                  )}>
                    <div className={cn(
                      "w-6 h-6 mr-3 rounded-full flex items-center justify-center",
                      isActive(`/browser/${account.id}/${account.defaultBucket}`) ? 
                        "bg-primary/10" : 
                        "bg-primary/5"
                    )}>
                      <i className={cn(
                        "ri-folder-fill",
                        isActive(`/browser/${account.id}/${account.defaultBucket}`) ? 
                          "text-primary" : 
                          "text-primary/70"
                      )}></i>
                    </div>
                    <span>{account.defaultBucket}</span>
                  </a>
                </Link>
              ))}
          </div>
        </div>

        {/* Accounts Section */}
        <div className="pt-4 mt-4 border-t border-border">
          <h2 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Accounts</h2>
          <div className="mt-2 space-y-1">
            {accounts.map((account) => (
              <Link key={account.id} href={`/browser/${account.id}`}>
                <a className={cn(
                  "w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg",
                  isActive(`/browser/${account.id}`) ? 
                    "bg-muted text-foreground" : 
                    "text-foreground hover:bg-muted"
                )}>
                  <div className={cn(
                    "w-6 h-6 mr-3 rounded-full flex items-center justify-center",
                    isActive(`/browser/${account.id}`) ? 
                      "bg-primary/10" : 
                      "bg-slate-200 dark:bg-slate-700"
                  )}>
                    <i className={cn(
                      "ri-amazon-line",
                      isActive(`/browser/${account.id}`) ? 
                        "text-primary" : 
                        "text-slate-600 dark:text-slate-300"
                    )}></i>
                  </div>
                  <span>{account.name}</span>
                </a>
              </Link>
            ))}
            
            <Button 
              variant="ghost" 
              className="w-full justify-start text-primary hover:bg-primary/5"
              onClick={() => setIsAddAccountOpen(true)}
            >
              <i className="ri-add-line mr-3 text-lg"></i>
              <span>Add Account</span>
            </Button>
            
            <Link href="/manage-accounts">
              <a className={cn(
                "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg",
                isActive("/manage-accounts") ? 
                  "bg-muted text-foreground" : 
                  "text-foreground hover:bg-muted"
              )}>
                <i className="ri-settings-line mr-3 text-lg"></i>
                <span>Manage Accounts</span>
              </a>
            </Link>
          </div>
        </div>
      </nav>

      {/* User Profile */}
      {user && (
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start px-4 py-2 font-medium hover:bg-muted rounded-lg"
              >
                <Avatar className="w-8 h-8 mr-3">
                  <AvatarImage src={user.profileImageUrl as string | undefined} alt={user.username || ""} />
                  <AvatarFallback>{generateInitials(user.username)}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <span className="block leading-tight">{user.username}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
                <i className="ri-arrow-down-s-line ml-auto"></i>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <Link href="/settings">
                  <DropdownMenuItem className="cursor-pointer">
                    <i className="ri-user-settings-line mr-2"></i>
                    <span>Settings</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/account-manager">
                  <DropdownMenuItem className="cursor-pointer">
                    <i className="ri-shield-keyhole-line mr-2"></i>
                    <span>Accounts</span>
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                <i className="ri-logout-box-line mr-2"></i>
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Add Account Dialog */}
      <AddAccountDialog 
        open={isAddAccountOpen} 
        onOpenChange={setIsAddAccountOpen} 
      />
    </aside>
  );
}

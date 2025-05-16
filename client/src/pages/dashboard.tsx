import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { StorageStats } from "@/components/files/StorageStats";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
import { S3Account, UserSettings } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  // Fetch user's S3 accounts
  const { data: accounts = [] } = useQuery<S3Account[]>({
    queryKey: ['/api/s3-accounts'],
    enabled: !!user,
  });

  // Fetch user settings
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ['/api/user-settings'],
    enabled: !!user,
  });

  // Find default account
  const defaultAccount = settings?.defaultAccountId
    ? accounts.find(account => account.id === settings.defaultAccountId)
    : accounts[0];

  // No longer auto-navigating to browser by default
  // Users should be able to see the dashboard first

  // Update to navigate directly to browser without account param
  const handleExploreAccount = () => {
    navigate('/browser');
  };
  
  // Navigate directly to a specific bucket
  const handleExploreBucket = (bucket: string, accountId: number) => {
    navigate(`/browser?account=${accountId}&bucket=${bucket}`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.username}!</h1>
        
        {/* Storage Statistics */}
        <StorageStats account={defaultAccount} />
        
        {/* My Files Section - Buckets as Folders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">My Files</h2>

          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {accounts.filter(account => account.defaultBucket).map(account => (
              <div 
                key={`bucket-${account.id}`}
                className="group cursor-pointer bg-card hover:bg-muted transition-colors rounded-lg border border-border overflow-hidden"
                onClick={() => handleExploreBucket(account.defaultBucket || '', account.id)}
              >
                <div className="relative aspect-square flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
                  <i className="ri-folder-fill text-6xl text-primary/80 group-hover:text-primary transition-colors"></i>
                  {/* Account badge */}
                  <div className="absolute top-2 right-2 bg-background/90 rounded-full px-2 py-1 text-xs font-medium border border-border">
                    <span>{account.name.substring(0, 8)}</span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-medium truncate group-hover:text-primary transition-colors">{account.defaultBucket}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{account.region}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Accounts Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">My Accounts</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/account-manager')}
            >
              <i className="ri-settings-line mr-2"></i>
              Manage Accounts
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(account => (
              <Card key={account.id} className="overflow-hidden">
                <CardHeader className="p-6 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center">
                      <i className="ri-amazon-line text-2xl text-primary"></i>
                    </div>
                    <div>
                      <CardTitle className="text-xl">{account.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {account.region}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Access Key</p>
                      <p className="font-medium">
                        {account.accessKeyId.substring(0, 5)}
                        •••••
                        {account.accessKeyId.substring(account.accessKeyId.length - 4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Default Bucket</p>
                      <p className="font-medium">
                        {account.defaultBucket ? (
                          <span className="text-primary">{account.defaultBucket}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not set</span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/50 p-6 flex justify-between">
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/account-manager`)}
                  >
                    Manage
                  </Button>
                  <Button 
                    onClick={() => {
                      if (account.defaultBucket) {
                        handleExploreBucket(account.defaultBucket, account.id);
                      } else {
                        navigate(`/browser?account=${account.id}`);
                      }
                    }}
                  >
                    {account.defaultBucket ? `Browse Files` : 'Select Bucket'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
            
            {/* Add Account Card */}
            <Card className="border-dashed border-2 flex flex-col justify-center items-center p-6">
              <div className="text-center">
                <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <i className="ri-add-line text-2xl text-primary"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">Add New Account</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Connect your Amazon S3 storage account
                </p>
                <Button onClick={() => setIsAddAccountOpen(true)}>
                  Add S3 Account
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        {settings?.lastAccessed && settings.lastAccessed.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <Card>
              <CardContent className="p-6">
                <ul className="space-y-4">
                  {settings.lastAccessed.slice(0, 5).map((path, index) => (
                    <li key={index} className="flex items-center">
                      <div className="bg-muted rounded-full p-2 mr-3">
                        <i className="ri-time-line text-lg"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{path}</p>
                        <p className="text-sm text-muted-foreground">Accessed recently</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          const parts = path.split('/');
                          if (parts.length >= 2) {
                            const accountId = accounts.find(a => 
                              a.name === parts[0])?.id || defaultAccount?.id;
                            if (accountId) {
                              navigate(`/browser/${accountId}/${parts.slice(1).join('/')}`);
                            }
                          }
                        }}
                      >
                        <i className="ri-arrow-right-line"></i>
                        <span className="sr-only">View</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AddAccountDialog 
        open={isAddAccountOpen} 
        onOpenChange={setIsAddAccountOpen} 
      />
    </Layout>
  );
}

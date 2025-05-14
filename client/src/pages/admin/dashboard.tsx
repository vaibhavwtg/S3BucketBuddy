import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { UserManagement } from "@/components/admin/UserManagement";
import { SubscriptionPlans } from "@/components/admin/SubscriptionPlans";
import { UsageStats } from "@/components/admin/UsageStats";
import { AdminLogs } from "@/components/admin/AdminLogs";
import { Redirect } from "wouter";
import { Loader2, Users, Wallet, HardDrive, Share2 } from "lucide-react";

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  
  // Fetch admin stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: !!user && (user as any).role === 'admin', // Only run if user is admin
  });
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Redirect if not admin
  if (!user || (user as any).role !== 'admin') {
    return <Redirect to="/" />;
  }
  
  return (
    <Layout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    stats?.totalUsers || 0
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isLoadingStats ? "Loading..." : `${stats?.newUsersThisWeek || 0} new this week`}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <div className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    stats?.activeSubscriptions || 0
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isLoadingStats ? "Loading..." : `${stats?.subscriptionConversionRate || 0}% conversion rate`}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Storage Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <div className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    stats?.totalAccounts || 0
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isLoadingStats ? "Loading..." : (stats?.totalStorageUsed || "Calculating...")}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shared Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Share2 className="h-5 w-5 text-muted-foreground" />
                <div className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    stats?.totalSharedFiles || 0
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isLoadingStats ? "Loading..." : `${stats?.activeSharedFiles || 0} active files`}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid grid-cols-4 md:w-auto w-full">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="usage">Usage Stats</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
          
          <TabsContent value="subscriptions" className="space-y-4">
            <SubscriptionPlans />
          </TabsContent>
          
          <TabsContent value="usage" className="space-y-4">
            <UsageStats />
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-4">
            <AdminLogs />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
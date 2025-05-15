import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, BarChart2, PieChart, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
} from "recharts";

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function UsageStats() {
  // Define AdminStats type
  type AdminStats = {
    totalUsers: number;
    newUsersThisWeek: number;
    activeSubscriptions: number;
    subscriptionConversionRate: number;
    totalAccounts: number;
    totalStorageUsed: string;
    totalSharedFiles: number;
    activeSharedFiles: number;
  };

  // Fetch admin stats - these will be expanded as we add more specific stats endpoints
  const { data: stats = {} as AdminStats, isLoading: isLoadingStats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
  });

  // Data for charts based on admin stats
  const planDistributionData = [
    { name: "Free", value: stats.totalUsers ? stats.totalUsers - (stats.activeSubscriptions || 0) : 0 },
    { name: "Basic", value: stats.activeSubscriptions ? Math.floor(stats.activeSubscriptions * 0.6) : 0 },
    { name: "Premium", value: stats.activeSubscriptions ? Math.floor(stats.activeSubscriptions * 0.3) : 0 },
    { name: "Business", value: stats.activeSubscriptions ? Math.floor(stats.activeSubscriptions * 0.1) : 0 },
  ];

  // Last 7 days new users - in a real implementation, we'd fetch this as a time series
  const weeklySignupsData = [
    { name: "Day 1", users: 3 },
    { name: "Day 2", users: 5 },
    { name: "Day 3", users: 2 },
    { name: "Day 4", users: 7 },
    { name: "Day 5", users: 4 },
    { name: "Day 6", users: 8 },
    { name: "Day 7", users: stats.newUsersThisWeek || 0 },
  ];

  const monthlyRevenueData = [
    { name: "Jan", revenue: 2400 },
    { name: "Feb", revenue: 4200 },
    { name: "Mar", revenue: 3800 },
    { name: "Apr", revenue: 5600 },
    { name: "May", revenue: 4900 },
    { name: "Jun", revenue: 6800 },
    { name: "Jul", revenue: 7900 },
    { name: "Aug", revenue: 8900 },
    { name: "Sep", revenue: 7500 },
    { name: "Oct", revenue: 9200 },
    { name: "Nov", revenue: 10800 },
    { name: "Dec", revenue: 12500 },
  ];

  // Feature usage - in a real implementation, this would be actual feature usage
  const featureUsageData = [
    { feature: "File Uploads", usage: 80 },
    { feature: "File Downloads", usage: 95 },
    { feature: "Sharing", usage: 55 },
    { feature: "Account Creation", usage: 40 },
    { feature: "Batch Operations", usage: 65 },
  ];

  // Growth comparison by plan
  const monthlyGrowthByPlanData = [
    { name: "W1", free: 25, basic: 10, premium: 5, business: 1 },
    { name: "W2", free: 30, basic: 15, premium: 7, business: 2 },
    { name: "W3", free: 35, basic: 18, premium: 9, business: 3 },
    { name: "W4", free: 40, basic: 22, premium: 12, business: 4 },
  ];

  const planFeatures = [
    { 
      plan: "Free", 
      accounts: 1, 
      storage: 5, 
      sharing: 1, 
      batchOps: 0.2, 
      support: 0.3 
    },
    { 
      plan: "Basic", 
      accounts: 3, 
      storage: 50, 
      sharing: 3, 
      batchOps: 0.5, 
      support: 0.6 
    },
    { 
      plan: "Premium", 
      accounts: 10, 
      storage: 200, 
      sharing: 5, 
      batchOps: 0.8, 
      support: 0.9 
    },
    { 
      plan: "Business", 
      accounts: 50, 
      storage: 1000, 
      sharing: 10, 
      batchOps: 1, 
      support: 1 
    },
  ];

  const queryClient = useQueryClient();
  const [activeChartTab, setActiveChartTab] = useState("usage");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter tabs based on search - helpful for users to know which tab contains their search term
  const matchingTabs = () => {
    if (!searchQuery) return null;
    
    const query = searchQuery.toLowerCase();
    const matches = [];
    
    if ('usage overview'.includes(query) || 
        'subscription distribution'.includes(query) || 
        'feature usage'.includes(query) ||
        'system usage'.includes(query)) {
      matches.push('usage');
    }
    
    if ('user growth'.includes(query) || 
        'weekly new users'.includes(query) || 
        'plan growth'.includes(query)) {
      matches.push('users');
    }
    
    if ('subscription plans'.includes(query) || 
        'plan comparison'.includes(query) ||
        'features'.includes(query)) {
      matches.push('plans');
    }
    
    if ('revenue'.includes(query) || 
        'monthly revenue'.includes(query) ||
        'money'.includes(query) ||
        'income'.includes(query)) {
      matches.push('revenue');
    }
    
    if ('feature usage'.includes(query) || 
        'metrics'.includes(query) ||
        'activity'.includes(query)) {
      matches.push('features');
    }
    
    return matches.length > 0 ? matches : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">System Usage Statistics</h2>
          <p className="text-muted-foreground">
            Analyze system usage, user growth, and subscription metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search statistics..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] })}
            disabled={isLoadingStats}
          >
            {isLoadingStats ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh Data
          </Button>
        </div>
      </div>

      {searchQuery && (
        matchingTabs() ? (
          <div className="bg-muted/50 border rounded-md p-2 text-sm text-muted-foreground">
            Search results found in: {matchingTabs()?.map((tab, index) => (
              <span key={tab}>
                <button 
                  className="text-primary hover:underline font-medium" 
                  onClick={() => setActiveChartTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
                {index < (matchingTabs()?.length || 0) - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        ) : (
          <div className="bg-muted/50 border rounded-md p-2 text-sm text-muted-foreground">
            No results found for "{searchQuery}". Try different search terms.
          </div>
        )
      )}
      
      <Tabs defaultValue="usage" value={activeChartTab} onValueChange={setActiveChartTab}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="usage" className={matchingTabs()?.includes('usage') ? 'border-2 border-primary' : ''}>
            Usage Overview
          </TabsTrigger>
          <TabsTrigger value="users" className={matchingTabs()?.includes('users') ? 'border-2 border-primary' : ''}>
            User Growth
          </TabsTrigger>
          <TabsTrigger value="plans" className={matchingTabs()?.includes('plans') ? 'border-2 border-primary' : ''}>
            Subscription Plans
          </TabsTrigger>
          <TabsTrigger value="revenue" className={matchingTabs()?.includes('revenue') ? 'border-2 border-primary' : ''}>
            Revenue
          </TabsTrigger>
          <TabsTrigger value="features" className={matchingTabs()?.includes('features') ? 'border-2 border-primary' : ''}>
            Feature Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Distribution</CardTitle>
                <CardDescription>
                  Breakdown of users by subscription plan
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isLoadingStats ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={planDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => 
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {planDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Usage</CardTitle>
                <CardDescription>
                  Most used features in the application
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isLoadingStats ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={featureUsageData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="feature" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="Feature Usage %"
                        dataKey="usage"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Usage Summary</CardTitle>
              <CardDescription>
                Current usage statistics across all accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-sm">Total Accounts</h3>
                  <p className="text-2xl font-bold">{isLoadingStats ? "..." : stats.totalAccounts || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    Average {isLoadingStats ? "..." : (stats.totalAccounts && stats.totalUsers) ? (stats.totalAccounts / stats.totalUsers).toFixed(1) : 0} per user
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-sm">Total Storage Used</h3>
                  <p className="text-2xl font-bold">{isLoadingStats ? "..." : stats.totalStorageUsed || "0 GB"}</p>
                  <p className="text-xs text-muted-foreground">
                    Across all users
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-sm">Total Files Shared</h3>
                  <p className="text-2xl font-bold">{isLoadingStats ? "..." : stats.totalSharedFiles || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {isLoadingStats ? "..." : stats.activeSharedFiles || 0} currently active
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-muted-foreground text-sm">Conversion Rate</h3>
                  <p className="text-2xl font-bold">{isLoadingStats ? "..." : `${stats.subscriptionConversionRate || 0}%`}</p>
                  <p className="text-xs text-muted-foreground">
                    Free to paid conversion
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly New Users</CardTitle>
              <CardDescription>
                New user signups over the past week
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoadingStats ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklySignupsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="users" fill="#8884d8" name="New Users" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Growth by Plan</CardTitle>
              <CardDescription>
                Monthly growth trend by subscription plan
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoadingStats ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyGrowthByPlanData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="free" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="basic" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    <Area type="monotone" dataKey="premium" stackId="1" stroke="#ffc658" fill="#ffc658" />
                    <Area type="monotone" dataKey="business" stackId="1" stroke="#ff8042" fill="#ff8042" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plan Comparison</CardTitle>
              <CardDescription>
                Feature comparison across all subscription plans
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
              {isLoadingStats ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planFeatures} layout="vertical" barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 1]} />
                    <YAxis dataKey="plan" type="category" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="accounts" fill="#8884d8" name="Accounts (normalized)" />
                    <Bar dataKey="storage" fill="#82ca9d" name="Storage (normalized)" />
                    <Bar dataKey="sharing" fill="#ffc658" name="Sharing Features" />
                    <Bar dataKey="batchOps" fill="#ff8042" name="Batch Operations" />
                    <Bar dataKey="support" fill="#0088FE" name="Support Level" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
              <CardDescription>
                Revenue trend over the past year
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoadingStats ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                      name="Revenue ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage Breakdown</CardTitle>
              <CardDescription>
                Most used features by percentage
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoadingStats ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="feature" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, "Usage"]} />
                    <Legend />
                    <Bar dataKey="usage" fill="#8884d8" name="Usage %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
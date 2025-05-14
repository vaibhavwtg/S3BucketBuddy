import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis, 
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LineChart, PieChart as PieChartIcon } from "lucide-react";

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function UsageStats() {
  // Fetch admin stats - these will be expanded as we add more specific stats endpoints
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  // Basic mock data for charts - in a real implementation, we'd fetch this from the API
  const planDistributionData = [
    { name: "Free", value: stats?.totalUsers ? stats.totalUsers - (stats.activeSubscriptions || 0) : 0 },
    { name: "Basic", value: stats?.activeSubscriptions ? Math.floor(stats.activeSubscriptions * 0.6) : 0 },
    { name: "Premium", value: stats?.activeSubscriptions ? Math.floor(stats.activeSubscriptions * 0.3) : 0 },
    { name: "Business", value: stats?.activeSubscriptions ? Math.floor(stats.activeSubscriptions * 0.1) : 0 },
  ].filter(item => item.value > 0);

  const mockMonthlyUsers = [
    { name: "Jan", users: 10 },
    { name: "Feb", users: 15 },
    { name: "Mar", users: 25 },
    { name: "Apr", users: 40 },
    { name: "May", users: 60 },
    { name: "Jun", users: 80 },
    { name: "Jul", users: 100 },
    { name: "Aug", users: 120 },
    { name: "Sep", users: 150 },
    { name: "Oct", users: 180 },
    { name: "Nov", users: 200 },
    { name: "Dec", users: stats?.totalUsers || 220 },
  ];

  if (isLoadingStats) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Usage Analytics
          </CardTitle>
          <CardDescription>
            View key usage metrics and trends for the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="growth" className="space-y-4">
            <TabsList>
              <TabsTrigger value="growth">User Growth</TabsTrigger>
              <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
            </TabsList>
            
            <TabsContent value="growth" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mockMonthlyUsers}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="users" fill="#8884d8" name="Total Users" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="plans" className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-72 w-[45%]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {planDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} users`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-medium mb-4">Subscription Plan Distribution</h3>
                  <div className="space-y-4">
                    {planDistributionData.map((plan, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span>{plan.name}</span>
                        </div>
                        <div className="font-medium">{plan.value} users</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Storage & Activity
          </CardTitle>
          <CardDescription>
            Storage usage statistics and user activity metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col space-y-1.5">
              <h3 className="text-sm font-medium">Total Storage Accounts</h3>
              <div className="text-2xl font-bold">{stats?.totalAccounts || 0}</div>
              <p className="text-sm text-muted-foreground">
                Across {stats?.totalUsers || 0} users
              </p>
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <h3 className="text-sm font-medium">Shared Files</h3>
              <div className="text-2xl font-bold">{stats?.totalSharedFiles || 0}</div>
              <p className="text-sm text-muted-foreground">
                {stats?.activeSharedFiles || 0} currently active
              </p>
            </div>
          </div>
          
          {/* Note: In a real implementation, we would add more charts showing storage usage trends,
               file sharing activity, etc. based on additional API endpoints */}
        </CardContent>
      </Card>
    </div>
  );
}
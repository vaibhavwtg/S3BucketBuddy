import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  Search, 
  Filter, 
  RefreshCw,
  User,
  Info,
  AlertTriangle,
  Shield,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminLog {
  id: number;
  adminId: string;
  adminUsername?: string;
  targetUserId?: string | null;
  targetUsername?: string | null;
  action: string;
  details: Record<string, any>;
  ip: string;
  createdAt: string;
}

export function AdminLogs() {
  const { toast } = useToast();
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);
  const [adminFilter, setAdminFilter] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch admin logs with filters and pagination
  const { data, isLoading, isError, refetch } = useQuery<{
    logs: AdminLog[];
    total: number;
    totalPages: number;
  }>({
    queryKey: ["/api/admin/logs", actionFilter, adminFilter, searchQuery, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);
      if (adminFilter) params.append('admin', adminFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      const queryString = params.toString();
      const url = `/api/admin/logs${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiRequest("GET", url);
      if (!response.ok) throw new Error("Failed to fetch admin logs");
      return response.json();
    },
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'user_create':
      case 'user_update':
      case 'user_delete':
        return <User className="h-4 w-4" />;
      case 'login':
      case 'logout':
      case 'password_change':
      case 'password_reset':
        return <Shield className="h-4 w-4" />;
      case 'role_change':
      case 'suspension':
        return <AlertTriangle className="h-4 w-4" />;
      case 'plan_change':
      case 'subscription_update':
        return <Activity className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Get action badge variant
  const getActionBadgeVariant = (action: string) => {
    if (action.toLowerCase().includes('delete') || action.toLowerCase().includes('suspension')) {
      return 'destructive';
    }
    if (action.toLowerCase().includes('create') || action.toLowerCase().includes('add')) {
      return 'default';
    }
    if (action.toLowerCase().includes('update') || action.toLowerCase().includes('change')) {
      return 'secondary';
    }
    return 'outline';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading admin logs. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Admin Action Logs</CardTitle>
            <CardDescription>
              Audit history of administrative actions
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1); // Reset to page 1 when search changes
              }}
            />
          </div>
          <div className="flex gap-2">
            <Select 
              value={actionFilter} 
              onValueChange={(value) => {
                setActionFilter(value);
                setPage(1); // Reset to page 1 when filter changes
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All actions</SelectItem>
                <SelectItem value="user">User management</SelectItem>
                <SelectItem value="login">Authentication</SelectItem>
                <SelectItem value="role">Role changes</SelectItem>
                <SelectItem value="subscription">Subscriptions</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={adminFilter} 
              onValueChange={(value) => {
                setAdminFilter(value);
                setPage(1); // Reset to page 1 when filter changes
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by admin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All admins</SelectItem>
                {data?.logs
                  .reduce((admins: { id: string; name: string }[], log) => {
                    if (!admins.some(admin => admin.id === log.adminId)) {
                      admins.push({ 
                        id: log.adminId, 
                        name: log.adminUsername || log.adminId 
                      });
                    }
                    return admins;
                  }, [])
                  .map(admin => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target User</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs && data.logs.length > 0 ? (
                data.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>{log.adminUsername || log.adminId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.targetUserId ? (
                        log.targetUsername || log.targetUserId
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>{log.ip}</TableCell>
                    <TableCell>
                      <div className="max-w-[300px] truncate">
                        {Object.keys(log.details).length > 0 ? (
                          JSON.stringify(log.details)
                        ) : (
                          <span className="text-muted-foreground">No details</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    No logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Page {page} of {data.totalPages} ({data.total} logs)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
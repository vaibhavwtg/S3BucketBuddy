import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export function AdminLogs() {
  // Define AdminLog type
  type AdminLogEntry = {
    id: number;
    adminId: string;
    adminUsername: string;
    targetUserId?: string;
    targetUsername?: string;
    action: string;
    details: Record<string, any> | string;
    createdAt: string;
  };

  // Fetch admin logs
  const {
    data: logs = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<AdminLogEntry[]>({
    queryKey: ['/api/admin/logs'],
  });

  // Get appropriate color for action type
  const getActionColor = (action: string) => {
    switch (action) {
      case 'update_user':
        return "bg-blue-500";
      case 'delete_account':
        return "bg-red-500";
      case 'modify_subscription':
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Format the JSON details for better display
  const formatDetails = (details: any) => {
    try {
      if (typeof details === 'string') {
        return details;
      }
      return Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    } catch (e) {
      return 'Unable to display details';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Admin Activity Logs
            </CardTitle>
            <CardDescription>
              History of administrative actions in the system
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1"
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Target User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.adminUsername}
                  </TableCell>
                  <TableCell>
                    {log.targetUsername || 'System'}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getActionColor(log.action)}`}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {formatDetails(log.details)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.createdAt
                      ? format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')
                      : 'Unknown'}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No admin logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
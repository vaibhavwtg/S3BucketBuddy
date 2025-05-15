import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ClipboardList, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";

export function AdminLogs() {
  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  
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
      case 'USER_CREATE':
      case 'PLAN_CREATE':
      case 'ACCOUNT_CREATE':
        return 'text-green-600';
      case 'USER_UPDATE':
      case 'PLAN_UPDATE':
      case 'ACCOUNT_UPDATE':
        return 'text-blue-600';
      case 'USER_DELETE':
      case 'PLAN_DELETE':
      case 'ACCOUNT_DELETE':
      case 'USER_SUSPEND':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Format action for display
  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\w\S*/g, (w) => w.replace(/^\w/, (c) => c.toUpperCase()));
  };

  // Format details for display
  const formatDetails = (details: Record<string, any> | string) => {
    if (typeof details === 'string') {
      return details;
    }
    
    try {
      // Format object details into readable string
      const detailsArray = Object.entries(details).map(([key, value]) => {
        // Format key for display
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        
        // Handle different value types
        let formattedValue = value;
        if (value === null) {
          formattedValue = 'None';
        } else if (typeof value === 'boolean') {
          formattedValue = value ? 'Yes' : 'No';
        } else if (typeof value === 'object') {
          formattedValue = JSON.stringify(value);
        }
        
        return `${formattedKey}: ${formattedValue}`;
      });
      
      return detailsArray.join(', ');
    } catch (error) {
      return 'Could not format details';
    }
  };
  
  // Filter logs based on search query
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      log.adminUsername.toLowerCase().includes(query) ||
      (log.targetUsername && log.targetUsername.toLowerCase().includes(query)) ||
      formatAction(log.action).toLowerCase().includes(query) ||
      formatDetails(log.details).toLowerCase().includes(query)
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Administration Activity Logs</CardTitle>
          <CardDescription>
            Track all administrative actions in the system
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.createdAt), "MMM d, yy - HH:mm:ss")}
                    </TableCell>
                    <TableCell>{log.adminUsername}</TableCell>
                    <TableCell>
                      <span className={getActionColor(log.action)}>
                        {formatAction(log.action)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.targetUsername || "System"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[400px]">
                          <div className="p-4 text-sm">
                            <p className="font-semibold mb-1">Action Details:</p>
                            <p className="text-muted-foreground whitespace-normal">
                              {formatDetails(log.details)}
                            </p>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="mb-2 text-lg font-medium">
              {searchQuery 
                ? `No logs found matching "${searchQuery}"`
                : "No logs found"}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? "Try a different search term"
                : "Admin activities will be shown here when performed"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
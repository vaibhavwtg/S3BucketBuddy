import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { FileBarChart, FileText, Eye, Download, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FileAccessLog {
  id: number;
  fileId: number;
  ipAddress: string;
  userAgent: string;
  referrer: string;
  country: string | null;
  city: string | null;
  isDownload: boolean;
  accessedAt: string;
}

interface FileAccessLogProps {
  fileId: number;
  filename: string;
  accessCount: number;
}

export function FileAccessLogs({ fileId, filename, accessCount }: FileAccessLogProps) {
  const [open, setOpen] = useState(false);
  
  const { data: logs = [], isLoading } = useQuery<FileAccessLog[]>({
    queryKey: [`/api/shared-files/${fileId}/access-logs`],
    enabled: open, // Only fetch when dialog is open
  });
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">Access Logs</span>
          <Badge variant="secondary" className="ml-1">{accessCount}</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Access History: {filename}</DialogTitle>
          <DialogDescription>
            Track when and how your shared file has been accessed
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="list" className="w-full mt-2">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>List View</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1">
              <FileBarChart className="h-4 w-4" />
              <span>Statistics</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="pt-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Referrer</TableHead>
                      <TableHead className="w-[80px]">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: FileAccessLog) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {formatDate(log.accessedAt)}
                        </TableCell>
                        <TableCell>{log.ipAddress}</TableCell>
                        <TableCell>
                          {log.country && log.city 
                            ? `${log.city}, ${log.country}`
                            : 'Unknown'}
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]">
                          {log.referrer === 'direct' ? 'Direct Access' : log.referrer}
                        </TableCell>
                        <TableCell>
                          {log.isDownload ? (
                            <Badge variant="outline" className="gap-1 border-blue-600 text-blue-600">
                              <Download className="h-3 w-3" />
                              <span>DL</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-purple-600 text-purple-600">
                              <Eye className="h-3 w-3" />
                              <span>View</span>
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No access logs found for this file.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="stats" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-md p-4 text-center">
                <h3 className="text-muted-foreground text-sm font-medium">Total Views</h3>
                <p className="text-3xl font-bold mt-2">
                  {logs ? logs.filter((log: FileAccessLog) => !log.isDownload).length : '-'}
                </p>
              </div>
              
              <div className="border rounded-md p-4 text-center">
                <h3 className="text-muted-foreground text-sm font-medium">Total Downloads</h3>
                <p className="text-3xl font-bold mt-2">
                  {logs ? logs.filter((log: FileAccessLog) => log.isDownload).length : '-'}
                </p>
              </div>
              
              <div className="border rounded-md p-4 text-center">
                <h3 className="text-muted-foreground text-sm font-medium">Unique Visitors</h3>
                <p className="text-3xl font-bold mt-2">
                  {logs ? new Set(logs.map((log: FileAccessLog) => log.ipAddress)).size : '-'}
                </p>
              </div>
            </div>
            
            {/* Additional stats visualization could be added here */}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
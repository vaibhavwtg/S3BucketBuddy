import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { formatBytes } from "@/lib/utils";
import { listBuckets, listObjects } from "@/lib/s3";
import { S3Account } from "@/lib/types";

interface StorageStatsProps {
  account?: S3Account;
}

export function StorageStats({ account }: StorageStatsProps) {
  // If we don't have an account, show placeholder stats
  if (!account) {
    return (
      <Card className="bg-card rounded-xl shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Storage</h2>
            <div className="text-right">
              <p className="text-muted-foreground text-sm">
                <span className="font-medium text-foreground">-- GB</span> of -- GB used
              </p>
            </div>
          </div>
          
          <Progress value={0} className="h-4" />
          
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary rounded-full mr-2"></div>
              <span className="text-muted-foreground">Documents</span>
              <span className="ml-auto font-medium">--</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[hsl(var(--chart-2))] rounded-full mr-2"></div>
              <span className="text-muted-foreground">Images</span>
              <span className="ml-auto font-medium">--</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[hsl(var(--chart-3))] rounded-full mr-2"></div>
              <span className="text-muted-foreground">Videos</span>
              <span className="ml-auto font-medium">--</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[hsl(var(--chart-4))] rounded-full mr-2"></div>
              <span className="text-muted-foreground">Other</span>
              <span className="ml-auto font-medium">--</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fetch buckets for the account
  const { data: buckets = [] } = useQuery({
    queryKey: [`/api/s3/${account.id}/buckets`],
    queryFn: () => listBuckets(account.id),
  });

  // For demonstration purposes, we'll assume a 100GB limit
  // In a real application, you would get this from the AWS API
  const totalStorageLimit = 100 * 1024 * 1024 * 1024; // 100 GB in bytes
  const usedStorage = 78.4 * 1024 * 1024 * 1024; // 78.4 GB in bytes (placeholder)
  const percentUsed = (usedStorage / totalStorageLimit) * 100;

  // Placeholder file type distribution
  const fileTypes = [
    { type: "Documents", size: 32.7 * 1024 * 1024 * 1024, color: "bg-primary" },
    { type: "Images", size: 15.2 * 1024 * 1024 * 1024, color: "bg-[hsl(var(--chart-2))]" },
    { type: "Videos", size: 25.8 * 1024 * 1024 * 1024, color: "bg-[hsl(var(--chart-3))]" },
    { type: "Other", size: 4.7 * 1024 * 1024 * 1024, color: "bg-[hsl(var(--chart-4))]" },
  ];

  return (
    <Card className="bg-card rounded-xl shadow-sm mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Storage</h2>
          <div className="text-right">
            <p className="text-muted-foreground text-sm">
              <span className="font-medium text-foreground">{formatBytes(usedStorage)}</span> of {formatBytes(totalStorageLimit)} used
            </p>
          </div>
        </div>
        
        <Progress value={percentUsed} className="h-4" />
        
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {fileTypes.map((fileType, index) => (
            <div key={index} className="flex items-center">
              <div className={`w-3 h-3 ${fileType.color} rounded-full mr-2`}></div>
              <span className="text-muted-foreground">{fileType.type}</span>
              <span className="ml-auto font-medium">{formatBytes(fileType.size)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

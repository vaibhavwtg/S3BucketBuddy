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

  // Note: This is demo/placeholder data as S3 doesn't provide storage quotas through API
  // In a production app, you would track this information separately or use CloudWatch metrics
  const totalStorageLimit = 5 * 1024 * 1024 * 1024; // 5 GB (free tier limit)
  
  // If we have a default bucket, get the objects to calculate actual size
  const { data: bucketObjects = { objects: [], folders: [], prefix: '', delimiter: '/' } } = useQuery({
    queryKey: [`/api/s3/${account.id}/objects`, account.defaultBucket],
    queryFn: async () => {
      if (account.defaultBucket) {
        try {
          return await listObjects(account.id, account.defaultBucket, '');
        } catch (error) {
          console.error('Error fetching objects for storage stats:', error);
          return { objects: [], folders: [], prefix: '', delimiter: '/' };
        }
      }
      return { objects: [], folders: [], prefix: '', delimiter: '/' };
    },
    enabled: !!account.defaultBucket,
  });
  
  // Calculate actual storage used based on object sizes
  const objectSizes = bucketObjects.objects.map(obj => obj.Size || 0);
  const usedStorage = objectSizes.length > 0 
    ? objectSizes.reduce((total, size) => total + size, 0) 
    : 0;
    
  const percentUsed = Math.min((usedStorage / totalStorageLimit) * 100, 100);
  
  // Calculate file type distribution
  const docTypes = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx'];
  const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff'];
  const videoTypes = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm'];
  
  // Group files by type
  const docsSize = bucketObjects.objects
    .filter(obj => docTypes.some(ext => obj.Key?.toLowerCase().endsWith(ext)))
    .reduce((total, obj) => total + (obj.Size || 0), 0);
    
  const imagesSize = bucketObjects.objects
    .filter(obj => imageTypes.some(ext => obj.Key?.toLowerCase().endsWith(ext)))
    .reduce((total, obj) => total + (obj.Size || 0), 0);
    
  const videosSize = bucketObjects.objects
    .filter(obj => videoTypes.some(ext => obj.Key?.toLowerCase().endsWith(ext)))
    .reduce((total, obj) => total + (obj.Size || 0), 0);
    
  const otherSize = usedStorage - docsSize - imagesSize - videosSize;
  
  const fileTypes = [
    { type: "Documents", size: docsSize, color: "bg-primary" },
    { type: "Images", size: imagesSize, color: "bg-[hsl(var(--chart-2))]" },
    { type: "Videos", size: videosSize, color: "bg-[hsl(var(--chart-3))]" },
    { type: "Other", size: otherSize, color: "bg-[hsl(var(--chart-4))]" },
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
        
        <p className="text-xs text-muted-foreground mt-2">
          {account.defaultBucket ? 
            `Showing storage usage for "${account.defaultBucket}" bucket. S3 doesn't have storage limits by default, 5GB is a typical free tier limit.` : 
            "Select a default bucket in account settings to see actual storage metrics."}
        </p>
        
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

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnhancedS3Bucket } from '@/lib/types';

interface BucketSelectProps {
  buckets: EnhancedS3Bucket[];
  currentBucket: string | undefined;
  onBucketChange: (bucketName: string, accountId: number) => void;
  isLoading: boolean;
}

export default function BucketSelect({ 
  buckets, 
  currentBucket, 
  onBucketChange, 
  isLoading 
}: BucketSelectProps) {
  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Loading buckets..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (!buckets || buckets.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No buckets available" />
        </SelectTrigger>
      </Select>
    );
  }

  const handleValueChange = (value: string) => {
    // Find the bucket object by name to get the account ID
    const selectedBucket = buckets.find(bucket => bucket.Name === value);
    if (selectedBucket) {
      onBucketChange(value, selectedBucket.accountId);
    }
  };

  return (
    <Select 
      value={currentBucket} 
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a bucket" />
      </SelectTrigger>
      <SelectContent>
        {buckets.map((bucket) => (
          <SelectItem key={`${bucket.accountId}-${bucket.Name}`} value={bucket.Name}>
            {bucket.Name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
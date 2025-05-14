import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAllS3Buckets } from "@/hooks/use-s3";
import { EnhancedS3Bucket } from "@/lib/types";

interface BatchOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operationType: "move" | "copy";
  sourceBucket: string;
  selectedCount: number;
  onConfirm: (destinationBucket: string, destinationPrefix: string) => void;
  isProcessing: boolean;
}

export function BatchOperationDialog({
  open,
  onOpenChange,
  operationType,
  sourceBucket,
  selectedCount,
  onConfirm,
  isProcessing = false,
}: BatchOperationDialogProps) {
  const [destinationBucket, setDestinationBucket] = useState<string>(sourceBucket);
  const [destinationPrefix, setDestinationPrefix] = useState<string>("");
  const { data: allBuckets = [], isLoading: isLoadingBuckets } = useAllS3Buckets();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDestinationBucket(sourceBucket);
      setDestinationPrefix("");
    }
  }, [open, sourceBucket]);

  const handleConfirm = () => {
    // Debug logging for batch operations
    console.log('Batch operation confirmation:', {
      operation: operationType,
      sourceBucket,
      destinationBucket,
      destinationPrefix,
      selectedCount
    });
    onConfirm(destinationBucket, destinationPrefix);
  };

  const title = operationType === "move" ? "Move Files" : "Copy Files";
  const description = operationType === "move" 
    ? `Move ${selectedCount} selected file(s) to another location`
    : `Copy ${selectedCount} selected file(s) to another location`;
  
  const actionLabel = operationType === "move" ? "Move Files" : "Copy Files";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="destination-bucket" className="text-right">
              Destination Bucket
            </Label>
            <Select
              value={destinationBucket}
              onValueChange={setDestinationBucket}
              disabled={isProcessing}
            >
              <SelectTrigger id="destination-bucket" className="col-span-3">
                <SelectValue placeholder="Select bucket" />
              </SelectTrigger>
              <SelectContent>
                {allBuckets.map((bucket: EnhancedS3Bucket) => (
                  <SelectItem 
                    key={`${bucket.accountId}-${bucket.Name}`} 
                    value={bucket.Name || ""}
                  >
                    {bucket.Name} ({bucket.accountName} - {bucket.region})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="destination-prefix" className="text-right">
              Destination Folder
            </Label>
            <Input
              id="destination-prefix"
              placeholder="e.g., my-folder/ (optional)"
              value={destinationPrefix}
              onChange={(e) => setDestinationPrefix(e.target.value)}
              className="col-span-3"
              disabled={isProcessing}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!destinationBucket || isProcessing}
            className="ml-2"
          >
            {isProcessing ? (
              <>
                <span className="mr-2">Processing...</span>
                <i className="ri-loader-4-line animate-spin"></i>
              </>
            ) : (
              actionLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
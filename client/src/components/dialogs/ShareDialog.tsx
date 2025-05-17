import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FileInfo {
  accountId: number;
  bucket: string;
  path: string;
  filename: string;
  contentType?: string;
  size: number;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileInfo;
}

export function ShareDialog({ 
  open, 
  onOpenChange,
  file 
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [expiry, setExpiry] = useState("7"); // Default 7 days
  const [shareUrl, setShareUrl] = useState("");
  const { toast } = useToast();
  
  const createShareMutation = useMutation({
    mutationFn: async (data: {
      accountId: number;
      bucket: string;
      path: string;
      expiresInDays: number;
      filename: string;
      contentType?: string;
      size: number;
    }) => {
      const res = await apiRequest("POST", "/api/shared-files", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setShareUrl(`${window.location.origin}/shared/${data.token}`);
      queryClient.invalidateQueries({ queryKey: ["/api/shared-files"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sharing failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  function handleCopy() {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }
  
  function handleShare() {
    const days = parseInt(expiry, 10);
    if (isNaN(days) || days < 1) {
      toast({
        title: "Invalid expiry",
        description: "Please enter a valid number of days for expiry",
        variant: "destructive"
      });
      return;
    }
    
    createShareMutation.mutate({
      accountId: file.accountId,
      bucket: file.bucket,
      path: file.path,
      expiresInDays: days,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size
    });
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            Create a shareable link for "{file.filename}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="expiry" className="text-right text-sm font-medium">
              Expires in days
            </label>
            <Input
              id="expiry"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="col-span-3"
              type="number"
              min="1"
              max="30"
            />
          </div>
          
          {shareUrl && (
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="url" className="text-right text-sm font-medium">
                Share URL
              </label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="url"
                  value={shareUrl}
                  readOnly
                  className="col-span-3"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopy}
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {!shareUrl && (
            <Button 
              onClick={handleShare}
              disabled={createShareMutation.isPending}
            >
              {createShareMutation.isPending ? "Creating..." : "Create share link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
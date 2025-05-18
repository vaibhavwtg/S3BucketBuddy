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
import { Check, Copy, Link, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [expiryType, setExpiryType] = useState("days"); // "days" or "never"
  const [expiryDays, setExpiryDays] = useState("7"); // Default 7 days
  const [allowDownload, setAllowDownload] = useState(true);
  const [directS3Link, setDirectS3Link] = useState(false);
  const [password, setPassword] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const { toast } = useToast();
  
  const createShareMutation = useMutation({
    mutationFn: async (data: {
      accountId: number;
      bucket: string;
      path: string;
      expiresInDays?: number;
      filename: string;
      contentType?: string;
      size: number;
      allowDownload: boolean;
      password?: string;
      directS3Link: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/shared-files", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setShareUrl(data.shareUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/shared-files"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sharing failed",
        description: error.message,
      });
    }
  });
  
  function handleCopy() {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link copied!",
        description: "The share link has been copied to your clipboard",
      });
    }
  }
  
  function handleShare() {
    if (expiryType === "days") {
      const days = parseInt(expiryDays, 10);
      if (isNaN(days) || days < 1) {
        toast({
          title: "Invalid expiry",
          description: "Please enter a valid number of days for expiry",
        });
        return;
      }
    }
    
    createShareMutation.mutate({
      accountId: file.accountId,
      bucket: file.bucket,
      path: file.path,
      expiresInDays: expiryType === "days" ? parseInt(expiryDays, 10) : undefined,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
      allowDownload,
      password: password.trim() || undefined,
      directS3Link
    });
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            Create a shareable link for "{file.filename}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Expiration Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Expiration</h4>
            <RadioGroup 
              defaultValue={expiryType}
              onValueChange={setExpiryType}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="never" id="never" />
                <Label htmlFor="never">Never expire</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="days" id="days" />
                <Label htmlFor="days">Expire after</Label>
                <Input
                  disabled={expiryType !== "days"}
                  id="expiry-days"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="w-20 ml-2"
                  type="number"
                  min="1"
                  max="365"
                />
                <span className="text-sm">days</span>
              </div>
            </RadioGroup>
          </div>
          
          {/* Access Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Access Options</h4>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="allow-download" 
                checked={allowDownload} 
                onCheckedChange={(checked) => setAllowDownload(checked as boolean)}
              />
              <Label htmlFor="allow-download">Allow download</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="direct-s3-link" 
                checked={directS3Link} 
                onCheckedChange={(checked) => setDirectS3Link(checked as boolean)}
              />
              <Label htmlFor="direct-s3-link">Use direct S3 link</Label>
            </div>
          </div>
          
          {/* Password Protection */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Password Protection (Optional)</h4>
            <Input
              id="password"
              type="password"
              placeholder="Leave empty for no password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {/* Generated Share URL */}
          {shareUrl && (
            <div className="space-y-2 mt-2">
              <h4 className="font-medium text-sm">Share URL</h4>
              <div className="flex gap-2">
                <Input
                  id="share-url"
                  value={shareUrl}
                  readOnly
                  className="flex-1"
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
              <div className="text-xs text-muted-foreground mt-1">
                {directS3Link ? (
                  <div className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Direct S3 link (faster, less secure)
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Link className="h-3 w-3" /> App-hosted link (slower, more secure)
                  </div>
                )}
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
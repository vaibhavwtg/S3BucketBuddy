import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatBytes, getFileIcon, getFileColor } from "@/lib/utils";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    accountId: number | null | undefined;
    bucket: string;
    path: string;
    filename: string;
    contentType?: string;
    size: number;
  };
}

const shareFileSchema = z.object({
  // Basic sharing options
  expiryOption: z.string().default("never"),
  expiresAt: z.string().optional(),
  allowDownload: z.boolean().default(true),
  
  // Advanced permission options
  permissionLevel: z.enum([
    "view", 
    "download", 
    "edit", 
    "comment", 
    "full", 
    "owner"
  ]).default("view"),
  
  // Access control options
  accessType: z.enum([
    "public", 
    "domain", 
    "email", 
    "password"
  ]).default("public"),
  
  // Password protection
  usePassword: z.boolean().default(false),
  password: z.string().optional(),
  
  // Embedding options
  isPublic: z.boolean().default(false), // Allow public/direct S3 access for embedding
  
  // Domain restriction options
  allowedDomains: z.string().optional(),
  
  // Recipient emails for specific sharing
  recipientEmails: z.string().optional(),
  
  // Advanced settings
  maxDownloads: z.number().optional(),
  notifyOnAccess: z.boolean().default(false),
  watermarkEnabled: z.boolean().default(false),
});

type ShareFileFormValues = z.infer<typeof shareFileSchema>;

export function ShareDialog({ open, onOpenChange, file }: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [directS3Url, setDirectS3Url] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if file is null or undefined before accessing properties
  const fileIcon = file && file.contentType ? getFileIcon(file.contentType) : 'file-line';
  const fileColor = file && file.contentType ? getFileColor(file.contentType) : 'text-blue-500';

  const form = useForm<ShareFileFormValues>({
    resolver: zodResolver(shareFileSchema),
    defaultValues: {
      // Basic sharing options
      expiryOption: "never",
      allowDownload: true,
      
      // Advanced permission options
      permissionLevel: "view",
      accessType: "public",
      
      // Protection options
      usePassword: false,
      
      // Embedding options
      isPublic: false,
      
      // Advanced settings
      notifyOnAccess: false,
      watermarkEnabled: false,
    },
  });

  // Watch form values
  const expiryOption = form.watch("expiryOption");
  const usePassword = form.watch("usePassword");
  const permissionLevel = form.watch("permissionLevel");
  const accessType = form.watch("accessType");
  const isPublic = form.watch("isPublic");
  const watermarkEnabled = form.watch("watermarkEnabled");

  // Handle expiry option changes
  const handleExpiryChange = (value: string) => {
    form.setValue("expiryOption", value);
    
    if (value === "custom") {
      // Set default expiry date to 7 days from now
      const date = new Date();
      date.setDate(date.getDate() + 7);
      form.setValue("expiresAt", date.toISOString().split("T")[0]);
    } else if (value === "never") {
      form.setValue("expiresAt", undefined);
    } else {
      const days = parseInt(value);
      const date = new Date();
      date.setDate(date.getDate() + days);
      form.setValue("expiresAt", date.toISOString().split("T")[0]);
    }
  };

  const shareFileMutation = useMutation({
    mutationFn: async (values: ShareFileFormValues) => {
      // Process recipient emails if provided
      const recipients = values.recipientEmails 
        ? values.recipientEmails.split(',').map(email => email.trim()).filter(email => email.length > 0)
        : [];
        
      // Process allowed domains if provided
      const domains = values.allowedDomains
        ? values.allowedDomains.split(',').map(domain => domain.trim()).filter(domain => domain.length > 0)
        : [];
      
      // Prepare the data for the API with advanced permission settings
      const shareData = {
        // Basic file info
        accountId: file.accountId,
        bucket: file.bucket,
        path: file.path,
        filename: file.filename,
        filesize: file.size,
        contentType: file.contentType,
        
        // Expiration settings
        expiresAt: values.expiryOption === "never" ? null : values.expiresAt,
        
        // Permission settings
        permissionLevel: values.permissionLevel,
        accessType: values.accessType,
        allowDownload: values.permissionLevel === "download" || values.allowDownload,
        
        // Security settings
        password: values.usePassword ? values.password : undefined,
        
        // Public access settings
        isPublic: values.isPublic,
        
        // Advanced settings
        allowedDomains: domains.length > 0 ? domains : undefined,
        maxDownloads: values.maxDownloads,
        notifyOnAccess: values.notifyOnAccess,
        watermarkEnabled: values.watermarkEnabled,
        
        // Recipient information
        recipients: recipients.length > 0 ? recipients : undefined,
      };
      
      const res = await apiRequest("POST", "/api/shared-files", shareData);
      return res.json();
    },
    onSuccess: (data) => {
      setShareUrl(data.shareUrl);
      // Store the direct S3 URL if available
      if (data.directS3Url) {
        setDirectS3Url(data.directS3Url);
      }
      
      toast({
        title: "Share link created",
        description: "Your file share link has been created successfully",
      });
      
      // Invalidate shared files query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/shared-files'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating share link",
        description: error instanceof Error ? error.message : "Failed to create share link",
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = () => {
    if (!shareUrl) return;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    });
  };

  function onSubmit(values: ShareFileFormValues) {
    shareFileMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
          <DialogDescription>
            Create a link to share your file with others.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center mb-4">
          <i className={`ri-${fileIcon} text-2xl ${fileColor} mr-3`}></i>
          <div>
            <p className="font-medium text-foreground">{file.filename}</p>
            <p className="text-sm text-muted-foreground">{formatBytes(file.size)} • {file.contentType}</p>
          </div>
        </div>
        
        {shareUrl ? (
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Share Link</label>
              <div className="flex">
                <Input 
                  value={shareUrl} 
                  readOnly 
                  className="flex-1 rounded-r-none" 
                />
                <Button 
                  onClick={handleCopyLink} 
                  className="rounded-l-none"
                >
                  Copy
                </Button>
              </div>
              
              {/* Direct S3 link as a backup option */}
              {directS3Url && (
                <div className="mt-3 text-xs text-muted-foreground flex items-center">
                  <i className="ri-information-line mr-1"></i>
                  <span>
                    If the share link doesn't work, you can use a{" "}
                    <Button 
                      variant="link" 
                      className="h-auto p-0 text-xs underline" 
                      onClick={() => {
                        navigator.clipboard.writeText(directS3Url);
                        toast({
                          title: "Direct link copied",
                          description: "A direct S3 URL has been copied to your clipboard"
                        });
                      }}
                    >
                      direct S3 link
                    </Button>{" "}
                    instead.
                  </span>
                </div>
              )}
            </div>
            
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="expiryOption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={handleExpiryChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expiration option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="custom">Custom date</SelectItem>
                        <SelectItem value="never">Never expires</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {expiryOption === "custom" && (
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="permissionLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permission Level</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="view" id="view-perm" />
                          <label htmlFor="view-perm" className="text-sm font-medium">
                            View only
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="download" id="download-perm" />
                          <label htmlFor="download-perm" className="text-sm font-medium">
                            Download files
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="edit" id="edit-perm" />
                          <label htmlFor="edit-perm" className="text-sm font-medium">
                            Edit metadata
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="comment" id="comment-perm" />
                          <label htmlFor="comment-perm" className="text-sm font-medium">
                            Add comments
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="full" id="full-perm" />
                          <label htmlFor="full-perm" className="text-sm font-medium">
                            Full access
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Control</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select access control" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Anyone with the link</SelectItem>
                        <SelectItem value="domain">Specific email domains</SelectItem>
                        <SelectItem value="email">Specific email addresses</SelectItem>
                        <SelectItem value="password">Password protected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Show domain input field when domain access type is selected */}
              {accessType === "domain" && (
                <FormField
                  control={form.control}
                  name="allowedDomains"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allowed Domains</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="example.com, company.org" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter comma-separated email domains
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Show recipient emails input when email access type is selected */}
              {accessType === "email" && (
                <FormField
                  control={form.control}
                  name="recipientEmails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Emails</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="user@example.com, person@company.org" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter comma-separated email addresses
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="usePassword"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Add password protection</FormLabel>
                      <FormDescription>
                        Recipients will need to enter a password to access the file.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {usePassword && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter a secure password" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable public S3 URL</FormLabel>
                      <FormDescription>
                        Creates a direct S3 URL that can be embedded in websites and persists even if the app is unavailable.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {/* Advanced settings section */}
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Advanced Settings</h3>
                
                {/* Download limit field */}
                <FormField
                  control={form.control}
                  name="maxDownloads"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Download Limit</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          placeholder="No limit" 
                          {...field}
                          value={field.value || ""}
                          onChange={e => {
                            const value = e.target.value;
                            field.onChange(value === "" ? undefined : parseInt(value));
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of downloads allowed (leave empty for unlimited)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Access notification setting */}
                <FormField
                  control={form.control}
                  name="notifyOnAccess"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 mb-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Notify on access
                        </FormLabel>
                        <FormDescription>
                          Send email notifications when someone accesses this file
                        </FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Watermark setting */}
                <FormField
                  control={form.control}
                  name="watermarkEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Apply watermark
                        </FormLabel>
                        <FormDescription>
                          Add a watermark to image and document previews
                        </FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={shareFileMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={shareFileMutation.isPending}
                >
                  {shareFileMutation.isPending ? "Creating..." : "Create Share Link"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
// We now use server-side validation instead of direct AWS SDK calls
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define a simplified bucket interface matching AWS response format
interface Bucket {
  Name?: string;
  CreationDate?: Date;
}

const awsRegions = [
  { value: "auto", label: "Auto-detect (Recommended)" },
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "ca-central-1", label: "Canada (Central)" },
  { value: "eu-west-1", label: "EU West (Ireland)" },
  { value: "eu-central-1", label: "EU Central (Frankfurt)" },
  { value: "eu-west-2", label: "EU West (London)" },
  { value: "eu-west-3", label: "EU West (Paris)" },
  { value: "eu-north-1", label: "EU North (Stockholm)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
];

const addAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  accessKeyId: z.string().min(1, "Access Key ID is required"),
  secretAccessKey: z.string().min(1, "Secret Access Key is required"),
  region: z.string().min(1, "Region is required"),
  saveCredentials: z.boolean().default(true).optional(),
  selectedBucket: z.string().min(1, "Bucket selection is required"),
});

type AddAccountFormValues = z.infer<typeof addAccountSchema>;

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requireBucketSelection?: boolean;
}

export function AddAccountDialog({ open, onOpenChange, requireBucketSelection = false }: AddAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [buckets, setBuckets] = useState<{ Name?: string }[]>([]);
  const [validatingCredentials, setValidatingCredentials] = useState(false);
  const [credentialsValidated, setCredentialsValidated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const form = useForm<AddAccountFormValues>({
    resolver: zodResolver(addAccountSchema),
    defaultValues: {
      name: "",
      accessKeyId: "",
      secretAccessKey: "",
      region: "auto",
      saveCredentials: true,
      selectedBucket: undefined,
    },
  });

  const addAccountMutation = useMutation({
    mutationFn: async (values: AddAccountFormValues) => {
      const res = await apiRequest("POST", "/api/s3-accounts", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account added",
        description: "Your S3 account has been added successfully",
      });
      
      // Invalidate the accounts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/s3-accounts'] });
      
      // Close the dialog
      onOpenChange(false);
      
      // Reset the form
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error adding account",
        description: error instanceof Error ? error.message : "Failed to add account",
        variant: "destructive",
      });
    },
  });

  // Function to validate S3 credentials and list buckets
  async function validateCredentials() {
    const accessKeyId = form.getValues("accessKeyId");
    const secretAccessKey = form.getValues("secretAccessKey");
    const region = form.getValues("region");
    
    if (!accessKeyId || !secretAccessKey) {
      toast({
        title: "Validation Error",
        description: "Please enter both Access Key ID and Secret Access Key",
        variant: "destructive",
      });
      return;
    }
    
    setValidatingCredentials(true);
    setCredentialsValidated(false);
    setValidationError(null);
    setBuckets([]);
    
    try {
      // Basic format validation - less strict to allow different AWS credential formats
      if (accessKeyId.length < 16) {
        throw new Error("Access Key ID appears to be too short. AWS Access Key IDs are typically 20 characters long.");
      }
      
      if (secretAccessKey.length < 30) {
        throw new Error("Secret Access Key appears to be too short. AWS Secret Access Keys are typically at least 40 characters long.");
      }
      
      // Use the server-side validation endpoint instead of direct AWS connection
      const response = await fetch('/api/validate-s3-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessKeyId,
          secretAccessKey,
          region,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle HTTP errors
        throw new Error(data.error || 'Failed to validate credentials');
      }
      
      if (data.valid && data.buckets && data.buckets.length > 0) {
        // Store the buckets and mark credentials as validated
        setBuckets(data.buckets);
        setCredentialsValidated(true);
        
        // Set the first bucket as default selected bucket
        if (data.buckets[0].Name) {
          form.setValue("selectedBucket", data.buckets[0].Name);
        }
        
        toast({
          title: "Credentials Validated",
          description: `Found ${data.buckets.length} buckets in your S3 account.`,
        });
      } else {
        // Handle case where validation succeeded but no buckets were found
        setBuckets([]);
        setValidationError(data.error || "No buckets found in this account. Make sure you have at least one bucket created.");
      }
    } catch (error: any) {
      console.error("Error validating S3 credentials:", error);
      
      // Set user-friendly error message
      const errorMessage = error.message || "Failed to validate AWS credentials";
      
      setValidationError(errorMessage);
      
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setValidatingCredentials(false);
    }
  }

  function onSubmit(values: AddAccountFormValues) {
    // Always require credentials to be validated
    if (!credentialsValidated) {
      toast({
        title: "Validation Required",
        description: "Please validate your credentials first",
        variant: "destructive",
      });
      return;
    }
    
    // If bucket selection is required, ensure a bucket is selected
    if (requireBucketSelection && !values.selectedBucket) {
      toast({
        title: "Bucket Required",
        description: "Please select a bucket to use",
        variant: "destructive",
      });
      return;
    }
    
    // Set the defaultBucket value to the selectedBucket for storage
    const formData = {
      ...values,
      defaultBucket: values.selectedBucket
    };
    
    // Submit the form
    addAccountMutation.mutate(formData);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle>Add Amazon S3 Account</DialogTitle>
          <DialogDescription>
            Connect to your S3 storage by entering your AWS credentials.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My S3 Account" {...field} />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this account.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="accessKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Key ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="AKIAIOSFODNN7EXAMPLE" 
                      {...field} 
                      disabled={credentialsValidated}
                    />
                  </FormControl>
                  <FormDescription>
                    Your AWS Access Key ID from IAM.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="secretAccessKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret Access Key</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" 
                        {...field}
                        disabled={credentialsValidated}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 pr-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={`ri-${showPassword ? 'eye-off' : 'eye'}-line text-muted-foreground`}></i>
                        <span className="sr-only">
                          {showPassword ? "Hide password" : "Show password"}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Your AWS Secret Access Key from IAM.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={credentialsValidated}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {awsRegions.map((region) => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose "Auto-detect" to let the system find the correct region for your account, or select a specific region if you know it.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Validate Credentials Button */}
            <div className="flex justify-end mt-2">
              <Button
                type="button"
                onClick={validateCredentials}
                disabled={validatingCredentials || credentialsValidated}
                className="w-full sm:w-auto"
              >
                {validatingCredentials ? (
                  <>
                    <i className="ri-loader-2-line animate-spin mr-2"></i>
                    Validating...
                  </>
                ) : credentialsValidated ? (
                  <>
                    <i className="ri-check-line mr-2"></i>
                    Credentials Validated
                  </>
                ) : (
                  <>
                    <i className="ri-shield-check-line mr-2"></i>
                    Validate Credentials
                  </>
                )}
              </Button>
            </div>
            
            {/* Validation Error Alert */}
            {validationError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>Validation Error</AlertTitle>
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
            
            {/* Bucket Selection */}
            {credentialsValidated && buckets.length > 0 && (
              <FormField
                control={form.control}
                name="selectedBucket"
                render={({ field }) => (
                  <FormItem className="mt-2">
                    <FormLabel>Select Bucket</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a bucket" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {buckets.map((bucket) => (
                          <SelectItem key={bucket.Name} value={bucket.Name || ""}>
                            {bucket.Name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the bucket you want to use with this account.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="saveCredentials"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 bg-muted mt-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Save credentials securely</FormLabel>
                    <FormDescription>
                      Your credentials will be encrypted and stored on the server.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-2 sticky bottom-0 bg-white dark:bg-gray-950 pb-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={addAccountMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={addAccountMutation.isPending}
              >
                {addAccountMutation.isPending ? "Adding..." : "Add Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

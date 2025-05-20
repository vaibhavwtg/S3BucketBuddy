import { useState, useEffect } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Define a simplified bucket interface matching AWS response format
interface Bucket {
  Name?: string;
  CreationDate?: Date;
}

const awsRegions = [
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

// Define a multi-step form schema
const addAccountBaseSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  accessKeyId: z.string().min(1, "Access Key ID is required"),
  secretAccessKey: z.string().min(1, "Secret Access Key is required"),
  region: z.string().min(1, "Region is required"),
  saveCredentials: z.boolean().default(true),
});

const addAccountFinalSchema = addAccountBaseSchema.extend({
  selectedBucket: z.string().optional(),
  defaultBucket: z.string().optional(),
});

type AddAccountBaseFormValues = z.infer<typeof addAccountBaseSchema>;
type AddAccountFinalFormValues = z.infer<typeof addAccountFinalSchema>;

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requireBucketSelection?: boolean;
}

export function AddAccountDialog({ open, onOpenChange, requireBucketSelection = false }: AddAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'credentials' | 'bucket'>('credentials');
  const [showPassword, setShowPassword] = useState(false);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [validatingCredentials, setValidatingCredentials] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Create a form for the initial credential step
  const form = useForm<AddAccountFinalFormValues>({
    resolver: zodResolver(addAccountFinalSchema),
    defaultValues: {
      name: "",
      accessKeyId: "",
      secretAccessKey: "",
      region: "us-east-1",
      saveCredentials: true,
      selectedBucket: undefined,
      defaultBucket: undefined,
    },
  });

  // Reset the form when the dialog opens/closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        form.reset();
        setBuckets([]);
        setStep('credentials');
        setValidationError(null);
      }, 300); // Short delay to allow the dialog close animation to complete
    }
  }, [open, form]);

  // Mutation for adding the account
  const addAccountMutation = useMutation({
    mutationFn: async (values: AddAccountFinalFormValues) => {
      // Make sure to include the selected bucket as the default bucket
      const finalValues = {
        ...values,
        defaultBucket: values.selectedBucket || "",
      };
      console.log("Submitting account data:", finalValues);
      const res = await apiRequest("POST", "/api/s3-accounts", finalValues);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account added successfully",
        description: "Your S3 account has been added and is ready to use.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/s3-accounts'] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error adding account:", error);
      toast({
        title: "Failed to add account",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    },
  });

  // Handle the validation of S3 credentials
  async function validateCredentials() {
    const { accessKeyId, secretAccessKey, region } = form.getValues();
    
    if (!accessKeyId || !secretAccessKey) {
      toast({
        title: "Missing credentials",
        description: "Please enter both Access Key ID and Secret Access Key",
      });
      return;
    }
    
    setValidatingCredentials(true);
    setValidationError(null);
    
    try {
      // Basic format validation
      if (accessKeyId.length < 16) {
        throw new Error("Access Key ID appears to be too short. AWS Access Key IDs are typically 20 characters long.");
      }
      
      if (secretAccessKey.length < 30) {
        throw new Error("Secret Access Key appears to be too short. AWS Secret Access Keys are typically at least 40 characters long.");
      }
      
      // Call the validation endpoint
      const response = await fetch('/api/validate-s3-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKeyId, secretAccessKey, region }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate credentials');
      }
      
      if (data.valid && data.buckets && data.buckets.length > 0) {
        // Success! We got buckets back
        setBuckets(data.buckets);
        
        // Set the first bucket as the default selected
        if (data.buckets[0]?.Name) {
          form.setValue("selectedBucket", data.buckets[0].Name);
        }
        
        // Move to bucket selection step
        setStep('bucket');
        
        toast({
          title: "Credentials valid",
          description: `Found ${data.buckets.length} buckets in your S3 account.`,
        });
      } else {
        // No buckets found
        setValidationError("No buckets found in this account. Make sure you have at least one bucket created.");
      }
    } catch (error: any) {
      console.error("Validation error:", error);
      setValidationError(error.message || "Failed to validate credentials");
      toast({
        title: "Validation failed",
        description: error.message || "Could not validate your AWS credentials",
      });
    } finally {
      setValidatingCredentials(false);
    }
  }

  // Handle form submission
  function onSubmit(values: AddAccountFinalFormValues) {
    if (step === 'credentials') {
      // When on the first step, validate credentials
      validateCredentials();
    } else {
      // On the bucket selection step, submit the form
      if (requireBucketSelection && !values.selectedBucket) {
        toast({
          title: "Bucket required",
          description: "Please select a bucket before adding the account",
        });
        return;
      }
      
      // Submit the account
      addAccountMutation.mutate(values);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'credentials' ? 'Add Amazon S3 Account' : 'Select Default Bucket'}
          </DialogTitle>
          <DialogDescription>
            {step === 'credentials' 
              ? 'Connect to your S3 storage by entering your AWS credentials.' 
              : 'Your credentials are validated. Now select a default bucket to use.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {step === 'credentials' ? (
              // Step 1: Enter credentials
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My AWS Account" {...field} />
                      </FormControl>
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
                        <Input placeholder="AKIAIOSFODNN7EXAMPLE" {...field} />
                      </FormControl>
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
                        Select the AWS region where your buckets are located
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="saveCredentials"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Save credentials securely</FormLabel>
                        <FormDescription>
                          Your credentials will be encrypted and stored securely
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {validationError && (
                  <Alert variant="destructive">
                    <AlertTitle>Validation Error</AlertTitle>
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              // Step 2: Select bucket
              <>
                <Card className="border border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-800">
                  <CardContent className="pt-4 pb-2">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      <i className="ri-check-line mr-1"></i>
                      Credentials validated successfully
                    </p>
                  </CardContent>
                </Card>
                
                <FormField
                  control={form.control}
                  name="selectedBucket"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Default Bucket</FormLabel>
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
                        This bucket will be selected by default when you open this account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('credentials')}
                  className="mt-2"
                >
                  <i className="ri-arrow-left-line mr-2"></i>
                  Back to Credentials
                </Button>
              </>
            )}
            
            <DialogFooter className="pt-4 border-t mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={validatingCredentials || addAccountMutation.isPending}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={validatingCredentials || addAccountMutation.isPending}
              >
                {validatingCredentials ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : addAccountMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : step === 'credentials' ? (
                  <>
                    <i className="ri-shield-check-line mr-2"></i>
                    Validate Credentials
                  </>
                ) : (
                  <>
                    <i className="ri-add-line mr-2"></i>
                    Add Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const awsRegions = [
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "ca-central-1", label: "Canada (Central)" },
  { value: "eu-west-1", label: "EU West (Ireland)" },
  { value: "eu-central-1", label: "EU Central (Frankfurt)" },
  { value: "eu-west-2", label: "EU West (London)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
];

export default function AddS3Account() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isBucketStep, setIsBucketStep] = useState(false);
  const [buckets, setBuckets] = useState<{ Name?: string }[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    accessKeyId: "",
    secretAccessKey: "",
    region: "ap-southeast-2",
    selectedBucket: "",
  });
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle bucket selection
  const handleSelectBucket = (bucketName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedBucket: bucketName
    }));
  };
  
  // Validate credentials
  const handleValidate = async () => {
    if (!formData.name || !formData.accessKeyId || !formData.secretAccessKey) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/validate-s3-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKeyId: formData.accessKeyId,
          secretAccessKey: formData.secretAccessKey,
          region: formData.region
        }),
        credentials: 'include' // Important for sending cookies
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to validate credentials");
      }
      
      if (!data.valid || !data.buckets?.length) {
        throw new Error("Invalid credentials or no buckets found");
      }
      
      // Success - show buckets
      setBuckets(data.buckets);
      setIsBucketStep(true);
      
      // Auto-select first bucket
      if (data.buckets[0]?.Name) {
        setFormData(prev => ({
          ...prev,
          selectedBucket: data.buckets[0].Name || ""
        }));
      }
      
      toast({
        title: "Credentials validated",
        description: `Found ${data.buckets.length} buckets in your account`
      });
      
    } catch (error: any) {
      console.error("Validation error:", error);
      toast({
        title: "Validation failed",
        description: error.message || "Could not validate credentials"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save account
  const handleSave = async () => {
    if (!formData.selectedBucket) {
      toast({
        title: "Select a bucket",
        description: "Please select a default bucket for this account"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/s3-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          accessKeyId: formData.accessKeyId,
          secretAccessKey: formData.secretAccessKey,
          region: formData.region,
          defaultBucket: formData.selectedBucket,
          saveCredentials: true
        }),
        credentials: 'include' // Important for sending cookies
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create account");
      }
      
      // Success
      toast({
        title: "Account created successfully",
        description: "Your S3 account has been added"
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/s3-accounts'] });
      navigate('/'); // Go back to dashboard
      
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast({
        title: "Error creating account",
        description: error.message || "Failed to create S3 account"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Add S3 Account</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>
              {isBucketStep ? "Select Default Bucket" : "Enter AWS Credentials"}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {!isBucketStep ? (
              // Step 1: Enter credentials
              <>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Account Name</Label>
                    <Input 
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="My AWS Account"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="accessKeyId">Access Key ID</Label>
                    <Input 
                      id="accessKeyId"
                      name="accessKeyId"
                      value={formData.accessKeyId}
                      onChange={handleChange}
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="secretAccessKey">Secret Access Key</Label>
                    <Input 
                      id="secretAccessKey"
                      name="secretAccessKey"
                      value={formData.secretAccessKey}
                      onChange={handleChange}
                      type="password"
                      placeholder="Your AWS secret key"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <select
                      id="region"
                      name="region"
                      value={formData.region}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading}
                    >
                      {awsRegions.map((region) => (
                        <option key={region.value} value={region.value}>
                          {region.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              // Step 2: Select bucket
              <>
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="text-green-700 dark:text-green-400 text-sm flex items-center">
                    <i className="ri-check-line mr-2"></i>
                    Credentials validated successfully
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Select Default Bucket</Label>
                  <div className="grid gap-2 max-h-60 overflow-y-auto">
                    {buckets.map((bucket) => (
                      <div 
                        key={bucket.Name} 
                        className={`p-3 border rounded-md cursor-pointer flex items-center justify-between ${
                          formData.selectedBucket === bucket.Name 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border'
                        }`}
                        onClick={() => handleSelectBucket(bucket.Name || "")}
                      >
                        <div className="flex items-center">
                          <i className="ri-folder-line mr-2 text-xl"></i>
                          <span>{bucket.Name}</span>
                        </div>
                        {formData.selectedBucket === bucket.Name && (
                          <i className="ri-check-line text-primary"></i>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            {isBucketStep ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsBucketStep(false)}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isLoading || !formData.selectedBucket}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Account"
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleValidate}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    "Validate Credentials"
                  )}
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
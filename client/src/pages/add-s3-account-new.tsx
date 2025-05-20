import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, FolderIcon } from "lucide-react";

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

export default function AddS3AccountNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form and validation states
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Credentials, 2: Select Bucket
  const [buckets, setBuckets] = useState<{ Name?: string }[]>([]);
  
  // Form data
  const [name, setName] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("ap-southeast-2");
  const [selectedBucket, setSelectedBucket] = useState("");
  
  // Validation function
  const validateCredentials = async () => {
    if (!name || !accessKeyId || !secretAccessKey) {
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
          accessKeyId,
          secretAccessKey,
          region
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to validate credentials");
      }
      
      if (!data.valid) {
        throw new Error("Invalid credentials");
      }
      
      if (!data.buckets?.length) {
        throw new Error("No buckets found in this account");
      }
      
      // Success - move to bucket selection
      setBuckets(data.buckets);
      
      // Auto-select first bucket
      if (data.buckets[0]?.Name) {
        setSelectedBucket(data.buckets[0].Name || "");
      }
      
      toast({
        title: "Credentials validated",
        description: `Found ${data.buckets.length} buckets in your account`
      });
      
      // Move to next step
      setStep(2);
      
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
  
  // Save account function
  const saveAccount = async () => {
    if (!selectedBucket) {
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
          name,
          accessKeyId,
          secretAccessKey,
          region,
          defaultBucket: selectedBucket,
          saveCredentials: true
        }),
        credentials: 'include'
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
  
  // Handle bucket selection
  const handleSelectBucket = (bucketName: string) => {
    setSelectedBucket(bucketName);
  };
  
  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Add S3 Account</h1>
        
        {step === 1 ? (
          // Step 1: Enter AWS Credentials
          <Card>
            <CardHeader>
              <CardTitle>Enter AWS Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input 
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My AWS Account"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accessKeyId">Access Key ID</Label>
                  <Input 
                    id="accessKeyId"
                    value={accessKeyId}
                    onChange={(e) => setAccessKeyId(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secretAccessKey">Secret Access Key</Label>
                  <Input 
                    id="secretAccessKey"
                    value={secretAccessKey}
                    onChange={(e) => setSecretAccessKey(e.target.value)}
                    type="password"
                    placeholder="Your AWS secret key"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <select
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
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
                
                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/')}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={validateCredentials}
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
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Step 2: Select Bucket
          <Card>
            <CardHeader>
              <CardTitle>Select Default Bucket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-green-700 dark:text-green-300 text-sm flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  Credentials validated successfully
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-base font-medium">Account Details</h3>
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-md">
                    <div>
                      <p className="text-sm text-muted-foreground">Account Name</p>
                      <p className="font-medium">{name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Region</p>
                      <p className="font-medium">{awsRegions.find(r => r.value === region)?.label || region}</p>
                    </div>
                  </div>
                </div>
              
                <div className="space-y-2">
                  <Label className="text-base font-medium">Select Default Bucket</Label>
                  <div className="grid gap-2 max-h-60 overflow-y-auto border rounded-md p-2">
                    {buckets.map((bucket) => (
                      <div 
                        key={bucket.Name} 
                        className={`p-3 border rounded-md cursor-pointer flex items-center justify-between ${
                          selectedBucket === bucket.Name 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => handleSelectBucket(bucket.Name || "")}
                      >
                        <div className="flex items-center">
                          <FolderIcon className="h-5 w-5 mr-2 text-amber-500" />
                          <span>{bucket.Name}</span>
                        </div>
                        {selectedBucket === bucket.Name && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={saveAccount}
                    disabled={isLoading || !selectedBucket}
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
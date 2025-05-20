import { useState } from "react";
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

export default function SimpleAddS3Account() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // States
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [buckets, setBuckets] = useState<string[]>([]);
  
  // Form data
  const [name, setName] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("ap-southeast-2");
  const [selectedBucket, setSelectedBucket] = useState("");
  
  // Validate credentials
  const handleValidate = async () => {
    if (!accessKeyId || !secretAccessKey) {
      toast({
        title: "Missing credentials",
        description: "Please enter your AWS Access Key ID and Secret Access Key."
      });
      return;
    }

    setIsValidating(true);
    
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
      
      if (!response.ok || !data.valid) {
        throw new Error(data.message || "Failed to validate credentials");
      }
      
      // Process buckets
      const bucketNames = data.buckets.map((b: any) => b.Name).filter(Boolean);
      
      if (!bucketNames.length) {
        throw new Error("No buckets found in this account");
      }
      
      // Set buckets and auto-select first one
      setBuckets(bucketNames);
      setSelectedBucket(bucketNames[0]);
      
      toast({
        title: "Validation successful",
        description: `Found ${bucketNames.length} buckets in your account.`,
      });
      
    } catch (error: any) {
      console.error("Validation error:", error);
      toast({
        title: "Validation failed",
        description: error.message || "Could not validate credentials"
      });
      
      // Clear bucket data
      setBuckets([]);
      setSelectedBucket("");
      
    } finally {
      setIsValidating(false);
    }
  };
  
  // Save account
  const handleSave = async () => {
    if (!name) {
      toast({
        title: "Missing information",
        description: "Please enter an account name"
      });
      return;
    }
    
    if (!selectedBucket) {
      toast({
        title: "No bucket selected",
        description: "Please select a default bucket"
      });
      return;
    }
    
    setIsSaving(true);
    
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
        title: "Account created",
        description: "Your S3 account has been added successfully."
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/s3-accounts'] });
      navigate('/');
      
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error adding account",
        description: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Add S3 Account</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div>
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My AWS Account"
                  className="mt-1"
                  disabled={isValidating || isSaving}
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accessKeyId">Access Key ID</Label>
                  <Input
                    id="accessKeyId"
                    value={accessKeyId}
                    onChange={(e) => setAccessKeyId(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="mt-1"
                    disabled={isValidating || isSaving}
                  />
                </div>
                
                <div>
                  <Label htmlFor="secretAccessKey">Secret Access Key</Label>
                  <Input
                    id="secretAccessKey"
                    value={secretAccessKey}
                    onChange={(e) => setSecretAccessKey(e.target.value)}
                    type="password"
                    placeholder="Your secret access key"
                    className="mt-1"
                    disabled={isValidating || isSaving}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="region">Region</Label>
                <select
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isValidating || isSaving}
                >
                  {awsRegions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleValidate}
                  disabled={isValidating || !accessKeyId || !secretAccessKey}
                >
                  {isValidating ? (
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
        
        {buckets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Default Bucket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-md p-3">
                <p className="text-green-700 dark:text-green-300 text-sm flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  Credentials validated successfully. Please select a default bucket.
                </p>
              </div>
              
              <div className="grid gap-2 max-h-64 overflow-y-auto mt-4 border rounded-md p-2">
                {buckets.map((bucket) => (
                  <div
                    key={bucket}
                    className={`p-3 border rounded-md cursor-pointer flex items-center justify-between ${
                      selectedBucket === bucket
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedBucket(bucket)}
                  >
                    <div className="flex items-center">
                      <FolderIcon className="h-5 w-5 mr-2 text-amber-500" />
                      <span>{bucket}</span>
                    </div>
                    
                    {selectedBucket === bucket && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !selectedBucket || !name}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Account"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
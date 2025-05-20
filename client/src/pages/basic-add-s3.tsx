import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function BasicAddS3() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isLoading, setIsLoading] = useState(false);
  const [buckets, setBuckets] = useState<{Name: string}[]>([]);
  
  const [name, setName] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("ap-southeast-2");
  const [selectedBucket, setSelectedBucket] = useState("");
  
  const validateCredentials = async () => {
    if (!accessKeyId || !secretAccessKey) {
      toast({ 
        title: "Missing credentials",
        description: "Please enter your AWS credentials"
      });
      return;
    }
    
    setIsLoading(true);
    setBuckets([]);
    
    try {
      const response = await fetch('/api/validate-s3-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKeyId,
          secretAccessKey,
          region
        })
      });
      
      const data = await response.json();
      
      if (data.valid && data.buckets?.length > 0) {
        setBuckets(data.buckets);
        setSelectedBucket(data.buckets[0].Name || "");
        
        toast({
          title: "Credentials validated",
          description: `Found ${data.buckets.length} buckets`
        });
      } else {
        toast({
          title: "Validation failed",
          description: "Invalid credentials or no buckets found"
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Validation error",
        description: "Failed to validate credentials"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!name) {
      toast({
        title: "Missing name",
        description: "Please provide an account name"
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
        })
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/s3-accounts'] });
        toast({
          title: "Account created",
          description: "S3 account added successfully"
        });
        navigate('/');
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to create account");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save account"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Add S3 Account</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My AWS Account"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <Label htmlFor="accessKeyId">Access Key ID</Label>
                <Input
                  id="accessKeyId"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <Label htmlFor="secretKey">Secret Access Key</Label>
                <Input
                  id="secretKey"
                  type="password"
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  placeholder="Your secret access key"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <Label htmlFor="region">Region</Label>
                <select
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {awsRegions.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={validateCredentials} disabled={isLoading}>
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
        
        {buckets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Default Bucket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Available Buckets</Label>
                  <div className="mt-2 border rounded-md overflow-hidden">
                    <select
                      className="w-full p-3 bg-background"
                      value={selectedBucket}
                      onChange={(e) => setSelectedBucket(e.target.value)}
                      size={Math.min(10, buckets.length)}
                    >
                      {buckets.map((bucket) => (
                        <option key={bucket.Name} value={bucket.Name}>
                          {bucket.Name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => navigate('/')}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isLoading || !selectedBucket}>
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
import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, FolderIcon, AlertCircle, CloudLightning } from "lucide-react";
import { WickedFilesLogo } from "@/components/logo/WickedFilesLogo";

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

export default function BeautifulAddAccount() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [buckets, setBuckets] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Form data
  const [name, setName] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("ap-southeast-2");
  const [selectedBucket, setSelectedBucket] = useState("");
  
  const validateCredentials = async () => {
    if (!accessKeyId || !secretAccessKey) {
      setErrorMessage("Please enter your AWS credentials");
      return;
    }
    
    setIsValidating(true);
    setErrorMessage("");
    
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
        const bucketNames = data.buckets.map((b: any) => b.Name).filter(Boolean);
        setBuckets(bucketNames);
        setSelectedBucket(bucketNames[0]);
        
        toast({
          title: "Credentials Validated",
          description: `Found ${bucketNames.length} buckets in your account`,
        });
      } else {
        setErrorMessage("Invalid credentials or no buckets found");
        toast({
          title: "Validation Failed",
          description: "Invalid credentials or no buckets found"
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      setErrorMessage("Failed to validate credentials. Please check your input and try again.");
      toast({
        title: "Validation Error",
        description: "Failed to validate credentials"
      });
    } finally {
      setIsValidating(false);
    }
  };
  
  const handleSave = async () => {
    if (!name) {
      setErrorMessage("Please enter an account name");
      return;
    }
    
    if (!selectedBucket) {
      setErrorMessage("Please select a default bucket");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage("");
    
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
          title: "Account Created",
          description: "Your S3 account has been added successfully"
        });
        
        navigate('/');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create account");
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Error saving account");
      
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
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-center mb-6">
          <WickedFilesLogo size={48} className="mr-3" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Add S3 Account to WickedFiles
          </h1>
        </div>
        
        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-800 dark:text-red-300 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CloudLightning className="h-5 w-5 mr-2 text-indigo-500" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My AWS Account"
                    className="border-input"
                    disabled={isValidating || isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accessKeyId">Access Key ID</Label>
                  <Input
                    id="accessKeyId"
                    value={accessKeyId}
                    onChange={(e) => setAccessKeyId(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="border-input"
                    disabled={isValidating || isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secretKey">Secret Access Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={secretAccessKey}
                    onChange={(e) => setSecretAccessKey(e.target.value)}
                    placeholder="Your secret access key"
                    className="border-input"
                    disabled={isValidating || isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <select
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isValidating || isLoading}
                  >
                    {awsRegions.map((region) => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-2">
                  <Button 
                    onClick={validateCredentials}
                    disabled={isValidating || !accessKeyId || !secretAccessKey}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
          
          <Card className={`md:col-span-1 ${buckets.length === 0 ? 'opacity-70' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FolderIcon className="h-5 w-5 mr-2 text-amber-500" />
                Bucket Selection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {buckets.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
                    <p className="text-green-700 dark:text-green-300 text-sm flex items-center">
                      <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                      Credentials validated successfully. Select a default bucket.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Available Buckets</Label>
                    <div className="max-h-[250px] overflow-y-auto border rounded-md divide-y">
                      {buckets.map((bucket) => (
                        <div
                          key={bucket}
                          className={`p-3 cursor-pointer flex items-center justify-between transition-colors ${
                            selectedBucket === bucket
                              ? 'bg-primary/10 dark:bg-primary/20' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedBucket(bucket)}
                        >
                          <div className="flex items-center">
                            <FolderIcon className="h-5 w-5 mr-2 text-amber-500" />
                            <span className="font-medium">{bucket}</span>
                          </div>
                          
                          {selectedBucket === bucket && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/')}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      onClick={handleSave}
                      disabled={isLoading || !selectedBucket || !name}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 min-h-[250px]">
                  <FolderIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">No Buckets Selected</h3>
                  <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
                    Validate your credentials first to see your available S3 buckets
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";

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

export default function AddAccountMinimal() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isLoading, setIsLoading] = useState(false);
  const [buckets, setBuckets] = useState<string[]>([]);
  
  const [name, setName] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("ap-southeast-2");
  const [selectedBucket, setSelectedBucket] = useState("");
  
  const validateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessKeyId || !secretAccessKey) {
      alert("Please enter your AWS credentials");
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
        })
      });
      
      const data = await response.json();
      
      if (data.valid && data.buckets?.length > 0) {
        const bucketNames = data.buckets.map((b: any) => b.Name).filter(Boolean);
        setBuckets(bucketNames);
        setSelectedBucket(bucketNames[0]);
        alert(`Found ${bucketNames.length} buckets. You can now save the account.`);
      } else {
        alert("Invalid credentials or no buckets found");
      }
    } catch (error) {
      console.error('Validation error:', error);
      alert("Failed to validate credentials");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      alert("Please enter an account name");
      return;
    }
    
    if (!selectedBucket) {
      alert("Please select a default bucket");
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
        alert("Account created successfully!");
        navigate('/');
      } else {
        alert("Failed to create account");
      }
    } catch (error) {
      console.error('Save error:', error);
      alert("Error saving account");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Add S3 Account</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          
          <form onSubmit={validateCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Account Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My AWS Account"
                className="w-full p-2 border rounded"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Access Key ID</label>
              <input
                type="text"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                className="w-full p-2 border rounded"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Secret Access Key</label>
              <input
                type="password"
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                placeholder="Your secret access key"
                className="w-full p-2 border rounded"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={isLoading}
              >
                {awsRegions.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? "Validating..." : "Validate Credentials"}
              </button>
            </div>
          </form>
        </div>
        
        {buckets.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Select Default Bucket</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Available Buckets</label>
                <select
                  className="w-full p-2 border rounded"
                  value={selectedBucket}
                  onChange={(e) => setSelectedBucket(e.target.value)}
                  size={Math.min(5, buckets.length)}
                >
                  {buckets.map((bucket) => (
                    <option key={bucket} value={bucket}>
                      {bucket}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  disabled={isLoading || !selectedBucket}
                >
                  {isLoading ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
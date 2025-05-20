import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";

// AWS regions for dropdown
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

export default function HtmlAddAccount() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // States
  const [isLoading, setIsLoading] = useState(false);
  const [validated, setValidated] = useState(false);
  const [bucketList, setBucketList] = useState<string[]>([]);
  const [error, setError] = useState("");
  
  // Form data
  const [name, setName] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("ap-southeast-2");
  const [selectedBucket, setSelectedBucket] = useState("");
  
  // Validate credentials
  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !accessKeyId || !secretAccessKey) {
      setError("Please fill in all required fields");
      return;
    }
    
    setError("");
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
      console.log("Validation response:", data);
      
      if (data.valid && data.buckets?.length > 0) {
        const bucketNames = data.buckets.map((b: any) => b.Name).filter(Boolean);
        console.log("Found buckets:", bucketNames);
        setBucketList(bucketNames);
        setSelectedBucket(bucketNames[0]);
        setValidated(true);
      } else {
        setError("Invalid credentials or no buckets found");
      }
    } catch (error) {
      console.error(error);
      setError("Error validating credentials");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save S3 account
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBucket) {
      setError("Please select a bucket");
      return;
    }
    
    setError("");
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
        navigate('/');
      } else {
        setError("Error creating account");
      }
    } catch (error) {
      console.error(error);
      setError("Error saving account");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <span role="img" aria-label="lightning" style={{ fontSize: '24px', marginRight: '10px' }}>⚡</span>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Add S3 Account to WickedFiles</h1>
        </div>
        
        {error && (
          <div style={{ 
            backgroundColor: '#FECACA', 
            color: '#B91C1C', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '20px' 
          }}>
            {error}
          </div>
        )}
        
        {!validated ? (
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '5px', 
            padding: '20px', 
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' 
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>AWS Account Information</h2>
            
            <form onSubmit={handleValidate}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Account Name
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My AWS Account"
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '4px' 
                  }}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Access Key ID
                </label>
                <input 
                  type="text" 
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '4px' 
                  }}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Secret Access Key
                </label>
                <input 
                  type="password" 
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  placeholder="Your secret access key"
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '4px' 
                  }}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '4px' 
                  }}
                  disabled={isLoading}
                >
                  {awsRegions.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <button 
                  type="submit"
                  disabled={isLoading}
                  style={{
                    backgroundColor: '#4F46E5',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  {isLoading ? 'Validating...' : 'Validate Credentials'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '5px', 
              padding: '20px', 
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginBottom: '20px'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Account Details</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '14px' }}>Account Name</p>
                  <p style={{ fontWeight: '500' }}>{name}</p>
                </div>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '14px' }}>Region</p>
                  <p style={{ fontWeight: '500' }}>{awsRegions.find(r => r.value === region)?.label}</p>
                </div>
              </div>
            </div>
            
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '5px', 
              padding: '20px', 
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' 
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Select Default Bucket</h2>
              
              <div style={{ 
                backgroundColor: '#ECFDF5', 
                color: '#065F46', 
                padding: '10px', 
                borderRadius: '5px', 
                marginBottom: '15px' 
              }}>
                Credentials validated successfully! Select your default bucket.
              </div>
              
              <form onSubmit={handleSave}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Available Buckets
                  </label>
                  <select
                    value={selectedBucket}
                    onChange={(e) => setSelectedBucket(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      border: '1px solid #D1D5DB', 
                      borderRadius: '4px' 
                    }}
                    size={Math.min(5, bucketList.length)}
                    disabled={isLoading}
                  >
                    {bucketList.map((bucket) => (
                      <option key={bucket} value={bucket}>
                        {bucket}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                  <button 
                    type="button"
                    onClick={() => navigate('/')}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#4B5563',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: '1px solid #D1D5DB',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  
                  <button 
                    type="submit"
                    disabled={isLoading || !selectedBucket}
                    style={{
                      backgroundColor: '#4F46E5',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: (isLoading || !selectedBucket) ? 'not-allowed' : 'pointer',
                      opacity: (isLoading || !selectedBucket) ? 0.7 : 1
                    }}
                  >
                    {isLoading ? 'Saving...' : 'Save Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
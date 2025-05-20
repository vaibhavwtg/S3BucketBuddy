import React, { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";

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

export default function BasicAddS3Account() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [name, setName] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("ap-southeast-2");
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [bucketList, setBucketList] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState("");
  const [showBucketSection, setShowBucketSection] = useState(false);
  
  // Function to validate S3 credentials
  const validateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !accessKeyId || !secretAccessKey) {
      setError("Please fill in all required fields");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
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
        setShowBucketSection(true);
        
        toast({
          title: "Validation Successful",
          description: `Found ${bucketNames.length} buckets in your account`
        });
      } else {
        setError("Invalid credentials or no buckets found");
        toast({
          title: "Validation Failed",
          description: "Please check your credentials and try again"
        });
      }
    } catch (error) {
      console.error("Error validating credentials:", error);
      setError("Error validating credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to save S3 account
  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBucket) {
      setError("Please select a bucket");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch('/api/s3-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          accessKeyId,
          secretAccessKey,
          region,
          defaultBucket: selectedBucket
        })
      });
      
      if (response.ok) {
        // Invalidate the query to refresh the list of accounts
        queryClient.invalidateQueries({ queryKey: ['/api/s3-accounts'] });
        
        toast({
          title: "Account Added",
          description: "Your S3 account has been added successfully"
        });
        
        // Navigate back to the main page
        navigate('/');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create account");
      }
    } catch (error: any) {
      console.error("Error saving account:", error);
      setError(error.message || "Error saving account");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '10px' }}>⚡</span>
          Add S3 Account to WickedFiles
        </h1>
        
        {error && (
          <div style={{ 
            backgroundColor: '#FEE2E2', 
            color: '#991B1B', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '20px' 
          }}>
            {error}
          </div>
        )}
        
        {!showBucketSection ? (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '8px', 
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' 
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>AWS Account Information</h2>
            <form onSubmit={validateCredentials}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Account Name*
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '4px' 
                  }}
                  placeholder="My AWS Account"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Access Key ID*
                </label>
                <input
                  type="text"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '4px' 
                  }}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Secret Access Key*
                </label>
                <input
                  type="password"
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '4px' 
                  }}
                  placeholder="Your secret access key"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
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
                >
                  {awsRegions.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    backgroundColor: '#4F46E5',
                    color: 'white',
                    padding: '10px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
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
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginBottom: '20px'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>AWS Account Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '14px' }}>Account Name</p>
                  <p style={{ fontWeight: 'bold' }}>{name}</p>
                </div>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '14px' }}>Region</p>
                  <p style={{ fontWeight: 'bold' }}>{awsRegions.find(r => r.value === region)?.label}</p>
                </div>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '14px' }}>Access Key ID</p>
                  <p style={{ fontWeight: 'bold' }}>{accessKeyId.substring(0, 5)}...{accessKeyId.substring(accessKeyId.length - 5)}</p>
                </div>
              </div>
            </div>
            
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '8px', 
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' 
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Select Default Bucket</h2>
              
              <div style={{ 
                backgroundColor: '#ECFDF5', 
                color: '#047857', 
                padding: '10px', 
                borderRadius: '5px', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{ marginRight: '8px' }}>✓</span>
                Credentials validated successfully! Select your default bucket.
              </div>
              
              <form onSubmit={saveAccount}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Available Buckets
                  </label>
                  <select
                    value={selectedBucket}
                    onChange={(e) => setSelectedBucket(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      border: '1px solid #D1D5DB', 
                      borderRadius: '4px',
                      height: '150px'
                    }}
                    size={Math.min(6, bucketList.length)}
                  >
                    {bucketList.map((bucket) => (
                      <option key={bucket} value={bucket}>
                        {bucket}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={() => setShowBucketSection(false)}
                    style={{
                      backgroundColor: 'white',
                      color: '#4B5563',
                      padding: '10px 16px',
                      borderRadius: '4px',
                      border: '1px solid #D1D5DB'
                    }}
                  >
                    Back
                  </button>
                  
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      style={{
                        backgroundColor: 'white',
                        color: '#4B5563',
                        padding: '10px 16px',
                        borderRadius: '4px',
                        border: '1px solid #D1D5DB',
                        marginRight: '10px'
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
                        padding: '10px 16px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: (isLoading || !selectedBucket) ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {isLoading ? 'Saving...' : 'Save Account'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
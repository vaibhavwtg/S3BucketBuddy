import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';

export default function SuperSimpleS3() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Form state
  const [name, setName] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('ap-southeast-2');
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [buckets, setBuckets] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  
  const validateCredentials = async () => {
    if (!name || !accessKeyId || !secretAccessKey) {
      setErrorMessage('Please fill in all required fields');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
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
      console.log('Validation response:', data);
      
      if (data.valid && data.buckets?.length > 0) {
        const bucketNames = data.buckets.map((b: any) => b.Name).filter(Boolean);
        console.log('Found buckets:', bucketNames);
        setBuckets(bucketNames);
        setSelectedBucket(bucketNames[0]);
        alert('Validation successful! ' + bucketNames.length + ' buckets found. Please select a bucket below.');
      } else {
        setErrorMessage('Invalid credentials or no buckets found');
      }
    } catch (error) {
      console.error('Error validating credentials:', error);
      setErrorMessage('Error validating credentials');
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveAccount = async () => {
    if (!selectedBucket) {
      setErrorMessage('Please select a bucket');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
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
        alert('Account created successfully!');
        navigate('/');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create account');
      }
    } catch (error: any) {
      console.error('Error saving account:', error);
      setErrorMessage(error.message || 'Error saving account');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '24px', marginRight: '10px' }}>⚡</span>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Add S3 Account to WickedFiles</h1>
      </div>
      
      <button 
        type="button" 
        onClick={() => navigate('/')}
        style={{
          backgroundColor: '#f3f4f6',
          border: '1px solid #d1d5db',
          padding: '8px 12px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}
      >
        Back to Home
      </button>
      
      {errorMessage && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {errorMessage}
        </div>
      )}
      
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
          AWS Account Information
        </h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Account Name:
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My AWS Account"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Access Key ID:
          </label>
          <input
            type="text"
            value={accessKeyId}
            onChange={(e) => setAccessKeyId(e.target.value)}
            placeholder="AKIAIOSFODNN7EXAMPLE"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Secret Access Key:
          </label>
          <input
            type="password"
            value={secretAccessKey}
            onChange={(e) => setSecretAccessKey(e.target.value)}
            placeholder="Your secret access key"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Region:
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          >
            <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
            <option value="us-east-1">US East (N. Virginia)</option>
            <option value="us-east-2">US East (Ohio)</option>
            <option value="us-west-1">US West (N. California)</option>
            <option value="us-west-2">US West (Oregon)</option>
            <option value="ca-central-1">Canada (Central)</option>
            <option value="eu-west-1">EU West (Ireland)</option>
            <option value="eu-central-1">EU Central (Frankfurt)</option>
            <option value="eu-west-2">EU West (London)</option>
            <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
            <option value="ap-northeast-2">Asia Pacific (Seoul)</option>
            <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
            <option value="ap-south-1">Asia Pacific (Mumbai)</option>
            <option value="sa-east-1">South America (São Paulo)</option>
          </select>
        </div>
        
        <button
          onClick={validateCredentials}
          disabled={isLoading}
          style={{
            backgroundColor: '#4f46e5',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '4px',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            fontWeight: 'bold',
            marginBottom: '10px',
            width: '100%'
          }}
        >
          {isLoading ? 'Validating...' : 'Validate Credentials'}
        </button>
      </div>
      
      {buckets.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>
            Select Default Bucket
          </h2>
          
          <div style={{
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            ✅ Credentials validated successfully! Please select your default bucket.
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Available Buckets:
            </label>
            <select
              value={selectedBucket}
              onChange={(e) => setSelectedBucket(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                height: '150px'
              }}
              size={Math.min(6, buckets.length)}
            >
              {buckets.map(bucket => (
                <option key={bucket} value={bucket}>
                  {bucket}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={saveAccount}
            disabled={isLoading || !selectedBucket}
            style={{
              backgroundColor: '#4f46e5',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: (isLoading || !selectedBucket) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !selectedBucket) ? 0.7 : 1,
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            {isLoading ? 'Saving...' : 'Save Account'}
          </button>
        </div>
      )}
    </div>
  );
}
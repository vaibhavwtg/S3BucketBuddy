import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";

export default function SimpleAddS3Account() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Form fields
  const [name, setName] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("ap-southeast-2");
  
  // UI state
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [buckets, setBuckets] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState("");
  
  // Handle credential validation
  async function validateCredentials(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name || !accessKeyId || !secretAccessKey) {
      setError("Please fill in all required fields");
      return;
    }
    
    setIsValidating(true);
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
        setBuckets(bucketNames);
        setSelectedBucket(bucketNames[0]);
      } else {
        setError("Invalid credentials or no buckets found");
      }
    } catch (err) {
      console.error("Error validating credentials:", err);
      setError("Error validating credentials. Please try again.");
    } finally {
      setIsValidating(false);
    }
  }
  
  // Handle account creation
  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedBucket) {
      setError("Please select a bucket");
      return;
    }
    
    setIsSaving(true);
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
        // Invalidate the query to refresh the accounts list
        queryClient.invalidateQueries({ queryKey: ['/api/s3-accounts'] });
        navigate('/');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create account");
      }
    } catch (err: any) {
      console.error("Error saving account:", err);
      setError(err.message || "Error saving account");
    } finally {
      setIsSaving(false);
    }
  }
  
  return (
    <Layout>
      <div style={{maxWidth: "800px", margin: "0 auto", padding: "20px"}}>
        <div style={{marginBottom: "20px", display: "flex", alignItems: "center"}}>
          <span style={{fontSize: "24px", marginRight: "10px"}}>⚡</span>
          <h1 style={{fontSize: "24px", fontWeight: "bold"}}>Add S3 Account to WickedFiles</h1>
        </div>
        
        {error && (
          <div style={{
            background: "#FEE2E2", 
            color: "#991B1B", 
            padding: "10px", 
            borderRadius: "4px", 
            marginBottom: "20px"
          }}>
            {error}
          </div>
        )}
        
        <div style={{background: "white", borderRadius: "8px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)"}}>
          <h2 style={{fontSize: "18px", fontWeight: "bold", marginBottom: "15px"}}>AWS Account Information</h2>
          
          <form onSubmit={validateCredentials}>
            <div style={{marginBottom: "15px"}}>
              <label style={{display: "block", marginBottom: "5px", fontWeight: "500"}}>
                Account Name*
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isValidating || isSaving || buckets.length > 0}
                placeholder="My AWS Account"
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "4px"
                }}
                required
              />
            </div>
            
            <div style={{marginBottom: "15px"}}>
              <label style={{display: "block", marginBottom: "5px", fontWeight: "500"}}>
                Access Key ID*
              </label>
              <input
                type="text"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                disabled={isValidating || isSaving || buckets.length > 0}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "4px"
                }}
                required
              />
            </div>
            
            <div style={{marginBottom: "15px"}}>
              <label style={{display: "block", marginBottom: "5px", fontWeight: "500"}}>
                Secret Access Key*
              </label>
              <input
                type="password"
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                disabled={isValidating || isSaving || buckets.length > 0}
                placeholder="Your secret access key"
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "4px"
                }}
                required
              />
            </div>
            
            <div style={{marginBottom: "15px"}}>
              <label style={{display: "block", marginBottom: "5px", fontWeight: "500"}}>
                Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={isValidating || isSaving || buckets.length > 0}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "4px"
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
            
            {buckets.length === 0 && (
              <div style={{textAlign: "right"}}>
                <button
                  type="submit"
                  disabled={isValidating || isSaving}
                  style={{
                    backgroundColor: "#4F46E5",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "none",
                    cursor: (isValidating || isSaving) ? "not-allowed" : "pointer",
                    opacity: (isValidating || isSaving) ? 0.7 : 1
                  }}
                >
                  {isValidating ? "Validating..." : "Validate Credentials"}
                </button>
              </div>
            )}
          </form>
          
          {buckets.length > 0 && (
            <div style={{marginTop: "30px"}}>
              <div style={{
                background: "#ECFDF5",
                color: "#065F46",
                padding: "10px",
                borderRadius: "4px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center"
              }}>
                <span style={{marginRight: "8px"}}>✓</span>
                Credentials validated successfully! Please select your default bucket.
              </div>
              
              <form onSubmit={saveAccount}>
                <div style={{marginBottom: "20px"}}>
                  <label style={{display: "block", marginBottom: "5px", fontWeight: "500"}}>
                    Select Default Bucket*
                  </label>
                  <select
                    value={selectedBucket}
                    onChange={(e) => setSelectedBucket(e.target.value)}
                    disabled={isSaving}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #D1D5DB",
                      borderRadius: "4px",
                      height: "150px"
                    }}
                    size={Math.min(6, buckets.length)}
                    required
                  >
                    {buckets.map(bucket => (
                      <option key={bucket} value={bucket}>
                        {bucket}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{display: "flex", justifyContent: "space-between"}}>
                  <button
                    type="button"
                    onClick={() => {
                      setBuckets([]);
                      setSelectedBucket("");
                    }}
                    disabled={isSaving}
                    style={{
                      backgroundColor: "transparent",
                      color: "#4B5563",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      border: "1px solid #D1D5DB",
                      cursor: isSaving ? "not-allowed" : "pointer"
                    }}
                  >
                    Back
                  </button>
                  
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      disabled={isSaving}
                      style={{
                        backgroundColor: "transparent",
                        color: "#4B5563",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        border: "1px solid #D1D5DB",
                        marginRight: "10px",
                        cursor: isSaving ? "not-allowed" : "pointer"
                      }}
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isSaving || !selectedBucket}
                      style={{
                        backgroundColor: "#4F46E5",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        border: "none",
                        cursor: (isSaving || !selectedBucket) ? "not-allowed" : "pointer",
                        opacity: (isSaving || !selectedBucket) ? 0.7 : 1
                      }}
                    >
                      {isSaving ? "Saving..." : "Save Account"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
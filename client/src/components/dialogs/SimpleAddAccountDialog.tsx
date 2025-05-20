import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface SimpleAddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimpleAddAccountDialog({ open, onOpenChange }: SimpleAddAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    accessKeyId: "",
    secretAccessKey: "",
    region: "us-east-1",
    defaultBucket: ""
  });
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.accessKeyId || !formData.secretAccessKey) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First validate the credentials
      const validateResponse = await fetch('/api/validate-s3-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessKeyId: formData.accessKeyId,
          secretAccessKey: formData.secretAccessKey,
          region: formData.region
        })
      });
      
      const validateResult = await validateResponse.json();
      
      if (!validateResponse.ok) {
        throw new Error(validateResult.message || "Failed to validate credentials");
      }
      
      if (!validateResult.valid || !validateResult.buckets?.length) {
        throw new Error("Invalid credentials or no buckets found in this account");
      }
      
      // If credentials are valid, choose the first bucket
      const defaultBucket = validateResult.buckets[0]?.Name || "";
      
      // Then create the account
      const createResponse = await fetch('/api/s3-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          defaultBucket
        })
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || "Failed to create account");
      }
      
      // Success
      toast({
        title: "Account created",
        description: `Account "${formData.name}" was created successfully with ${validateResult.buckets.length} buckets`
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/s3-accounts'] });
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        accessKeyId: "",
        secretAccessKey: "",
        region: "us-east-1",
        defaultBucket: ""
      });
      
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create S3 account"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add S3 Account</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input 
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="My AWS Account"
              disabled={isLoading}
              required
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
              required
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
              required
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
              <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-east-2">US East (Ohio)</option>
              <option value="us-west-1">US West (N. California)</option>
              <option value="us-west-2">US West (Oregon)</option>
            </select>
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Add Account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
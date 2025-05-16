import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function DebugLogin() {
  const [_, navigate] = useLocation();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleTestLogin = async () => {
    try {
      setStatus('loading');
      
      // Direct login with admin credentials
      const response = await apiRequest("POST", "/api/login", {
        email: "admin@wickedfiles.com",
        password: "password123"
      });
      
      const data = await response.json();
      console.log("Login successful:", data);
      
      setStatus('success');
      // Wait a moment before redirecting
      setTimeout(() => {
        navigate("/");
      }, 1000);
      
    } catch (err) {
      console.error("Login error:", err);
      setStatus('error');
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Debug Login</CardTitle>
          <CardDescription>
            Use this page to log in with the test account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p><strong>Email:</strong> admin@wickedfiles.com</p>
              <p><strong>Password:</strong> password123</p>
            </div>
            
            {status === 'error' && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded text-sm">
                {error || "An error occurred during login."}
              </div>
            )}
            
            {status === 'success' && (
              <div className="p-3 bg-primary/10 border border-primary rounded text-sm">
                Login successful! Redirecting...
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleTestLogin} 
            disabled={status === 'loading' || status === 'success'}
            className="w-full"
          >
            {status === 'loading' ? "Logging in..." : "Login with Test Account"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
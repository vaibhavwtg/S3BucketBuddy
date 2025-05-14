import { Switch, Route, useLocation, useRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/login";
import Dashboard from "@/pages/dashboard";
import Browser from "@/pages/browser";
import SharedFiles from "@/pages/shared-files";
import AccountSettings from "@/pages/account-settings";
import AccountManager from "@/pages/account-manager";
import { ThemeProvider } from "@/components/ui/theme-provider";
import PublicSharedFile from "@/pages/public-shared-file";
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { Button } from "@/components/ui/button";

// Protected route component
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType, path?: string }) {
  const { isAuthenticated, isLoading, isUnauthorized, login } = useAuth();
  
  useEffect(() => {
    if (!isLoading && (isUnauthorized || !isAuthenticated)) {
      // Redirect to login page if we know we're not authenticated
      console.log("Not authenticated, redirecting to login");
      login();
    }
  }, [isAuthenticated, isLoading, isUnauthorized, login]);
  
  // Show loading state while checking authentication
  if (isLoading || (!isAuthenticated && !isUnauthorized)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  // Only render the component if authenticated
  return isAuthenticated ? <Component {...rest} /> : null;
}

// Public route that should be accessible without login
function PublicRoute({ component: Component, ...rest }: { component: React.ComponentType, path?: string }) {
  return <Component {...rest} />;
}

// Login page that redirects to Replit Auth
function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-primary">
            CloudStore
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Your simple S3 management solution
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <Button 
            className="w-full py-6 text-lg" 
            onClick={() => window.location.href = "/api/login"}
          >
            Log in with Replit
          </Button>
          
          <p className="text-sm text-center text-gray-500">
            You'll be redirected to Replit to authenticate
          </p>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Protected routes */}
      <Route path="/" component={(props) => <ProtectedRoute component={Dashboard} {...props} />} />
      <Route path="/browser" component={(props) => <ProtectedRoute component={Browser} {...props} />} />
      <Route path="/shared" component={(props) => <ProtectedRoute component={SharedFiles} {...props} />} />
      <Route path="/settings" component={(props) => <ProtectedRoute component={AccountSettings} {...props} />} />
      <Route path="/manage-accounts" component={(props) => <ProtectedRoute component={AccountManager} {...props} />} />
      <Route path="/account-manager" component={(props) => <ProtectedRoute component={AccountManager} {...props} />} />
      
      {/* Public routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/shared/:token" component={(props) => <PublicRoute component={PublicSharedFile} {...props} />} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="cloudstore-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

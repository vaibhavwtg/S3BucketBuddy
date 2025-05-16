import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Browser from "@/pages/browser";
import SharedFiles from "@/pages/shared-files";
import AccountSettings from "@/pages/account-settings";
import AccountManager from "@/pages/account-manager";
import AdminDashboard from "@/pages/admin/dashboard";
import DebugLogin from "@/pages/debug-login";
import DirectBrowser from "@/pages/direct-browser";
import BucketViewer from "@/pages/bucket-viewer";
import SimpleBrowser from "@/pages/simple-browser";
import S3FileViewer from "@/pages/s3-file-viewer";
import { ThemeProvider } from "@/components/ui/theme-provider";
import PublicSharedFile from "@/pages/public-shared-file";
import { useEffect } from "react";
import { useAuth, AuthProvider } from "@/hooks/use-auth.tsx";
import { Loader2 } from "lucide-react";

// Protected route component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [_, navigate] = useLocation();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to auth page if not authenticated
      console.log("Not authenticated, redirecting to auth page");
      navigate("/auth");
    }
  }, [isAuthenticated, isLoading, navigate]);
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  // Only render the component if authenticated
  return isAuthenticated ? <Component /> : null;
}

// Public route that should be accessible without login
function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      {/* Put more specific routes before the catch-all route */}
      <Route path="/browser/:accountId/:path*">
        <ProtectedRoute component={Browser} />
      </Route>
      <Route path="/browser">
        <ProtectedRoute component={Browser} />
      </Route>
      <Route path="/s3-files/:accountId">
        <ProtectedRoute component={S3FileViewer} />
      </Route>
      <Route path="/s3-files">
        <ProtectedRoute component={S3FileViewer} />
      </Route>
      <Route path="/simple-browser/:accountId/:bucketName*">
        <ProtectedRoute component={SimpleBrowser} />
      </Route>
      <Route path="/simple-browser/:accountId">
        <ProtectedRoute component={SimpleBrowser} />
      </Route>
      <Route path="/simple-browser">
        <ProtectedRoute component={SimpleBrowser} />
      </Route>
      <Route path="/bucket-viewer/:accountId/:bucket*">
        <ProtectedRoute component={BucketViewer} />
      </Route>
      <Route path="/bucket-viewer/:accountId">
        <ProtectedRoute component={BucketViewer} />
      </Route>
      <Route path="/bucket-viewer">
        <ProtectedRoute component={BucketViewer} />
      </Route>
      <Route path="/direct-browser/:accountId">
        <ProtectedRoute component={DirectBrowser} />
      </Route>
      <Route path="/direct-browser">
        <ProtectedRoute component={DirectBrowser} />
      </Route>
      <Route path="/shared">
        <ProtectedRoute component={SharedFiles} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={AccountSettings} />
      </Route>
      <Route path="/manage-accounts">
        <ProtectedRoute component={AccountManager} />
      </Route>
      <Route path="/account-manager">
        <ProtectedRoute component={AccountManager} />
      </Route>
      
      {/* Admin routes */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} />
      </Route>
      
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/debug-login" component={DebugLogin} />
      <Route path="/shared/:token" component={PublicSharedFile} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="wickedfiles-theme">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

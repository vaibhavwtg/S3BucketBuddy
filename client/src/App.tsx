import React, { Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
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
import { useAuth, AuthProvider } from "@/hooks/use-auth";

// Protected route component
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, path?: string }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Route
      {...rest}
      component={(props: any) => 
        isAuthenticated ? <Component {...props} /> : <Redirect to="/login" />
      }
    />
  );
}

// Login route that redirects to dashboard if already logged in
function LoginRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  
  return isAuthenticated ? <Redirect to="/dashboard" /> : <Login />;
}

function Router() {
  return (
    <Switch>
      {/* Public Pages */}
      <Route path="/" component={LoginRoute} />
      <Route path="/login" component={LoginRoute} />
      <Route path="/shared/:token" component={PublicSharedFile} />
      
      {/* Protected Routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/browser" component={Browser} />
      <ProtectedRoute path="/shared" component={SharedFiles} />
      <ProtectedRoute path="/settings" component={AccountSettings} />
      <ProtectedRoute path="/manage-accounts" component={AccountManager} />
      <ProtectedRoute path="/account-manager" component={AccountManager} />
      <Route 
        path="/admin/users" 
        component={() => {
          const AdminUsers = React.lazy(() => import("@/pages/admin/users"));
          return (
            <Suspense fallback={
              <div className="flex h-screen w-full items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
              </div>
            }>
              <ProtectedRoute path="/admin/users" component={AdminUsers} />
            </Suspense>
          );
        }} 
      />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="cloudstore-theme">
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

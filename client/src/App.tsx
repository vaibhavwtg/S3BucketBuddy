import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/login";
import SignUp from "@/pages/auth/signup";
import Dashboard from "@/pages/dashboard";
import Browser from "@/pages/browser";
import SharedFiles from "@/pages/shared-files";
import AccountSettings from "@/pages/account-settings";
import AccountManager from "@/pages/account-manager";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import PublicSharedFile from "@/pages/public-shared-file";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={SignUp} />
      <Route path="/browser/:accountId/:bucket/:prefix*" component={Browser} />
      <Route path="/browser/:accountId" component={Browser} />
      <Route path="/shared" component={SharedFiles} />
      <Route path="/settings" component={AccountSettings} />
      <Route path="/manage-accounts" component={AccountManager} />
      <Route path="/shared/:token" component={PublicSharedFile} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="cloudstore-theme">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

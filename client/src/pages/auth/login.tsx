import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Login() {
  const { toast } = useToast();

  const handleLogin = () => {
    // Redirect to the Replit Auth endpoint
    window.location.href = "/api/login";
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>Sign in to access your S3 files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Button 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800" 
              onClick={handleLogin}
            >
              Sign in with Replit
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms">
              <a className="underline underline-offset-4 hover:text-primary">Terms of Service</a>
            </Link>{" "}
            and{" "}
            <Link href="/privacy">
              <a className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
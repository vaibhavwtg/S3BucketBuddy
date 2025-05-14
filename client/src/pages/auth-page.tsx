import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

// Form validation schemas
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const registerSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [_, navigate] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Handle login form submit
  const onLoginSubmit = async (values: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync({
        email: values.email,
        password: values.password
      });
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  // Handle register form submit
  const onRegisterSubmit = async (values: RegisterFormValues) => {
    try {
      await registerMutation.mutateAsync({
        username: values.username,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword
      });
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  // If still checking auth status, show loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container relative flex flex-col justify-center items-center min-h-screen">
      <div className="lg:flex lg:shadow-lg lg:rounded-lg w-full lg:max-w-6xl overflow-hidden">
        {/* Login/Register Form */}
        <div className="lg:w-1/2 p-6 lg:p-10">
          <div className="flex flex-col justify-center space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold">S3 Browser</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Manage your Amazon S3 storage with ease
              </p>
            </div>

            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>
                      Enter your credentials to access your S3 accounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="name@example.com"
                          {...loginForm.register("email")}
                        />
                        {loginForm.formState.errors.email && (
                          <p className="text-sm text-red-500">
                            {loginForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          {...loginForm.register("password")}
                        />
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-red-500">
                            {loginForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginForm.formState.isSubmitting}
                      >
                        {loginForm.formState.isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Sign In
                      </Button>
                    </form>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <div className="relative w-full">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <a href="/api/auth/google" className="w-full">
                        <Button variant="outline" className="w-full flex items-center justify-center">
                          <FcGoogle className="h-4 w-4 mr-2" />
                          Sign in with Google
                        </Button>
                      </a>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>Create an account</CardTitle>
                    <CardDescription>
                      Sign up to start managing your S3 storage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="johndoe"
                          {...registerForm.register("username")}
                        />
                        {registerForm.formState.errors.username && (
                          <p className="text-sm text-red-500">
                            {registerForm.formState.errors.username.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="name@example.com"
                          {...registerForm.register("email")}
                        />
                        {registerForm.formState.errors.email && (
                          <p className="text-sm text-red-500">
                            {registerForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          {...registerForm.register("password")}
                        />
                        {registerForm.formState.errors.password && (
                          <p className="text-sm text-red-500">
                            {registerForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          {...registerForm.register("confirmPassword")}
                        />
                        {registerForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-red-500">
                            {registerForm.formState.errors.confirmPassword.message}
                          </p>
                        )}
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerForm.formState.isSubmitting}
                      >
                        {registerForm.formState.isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Create Account
                      </Button>
                    </form>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <div className="relative w-full">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <a href="/api/auth/google" className="w-full">
                        <Button variant="outline" className="w-full flex items-center justify-center">
                          <FcGoogle className="h-4 w-4 mr-2" />
                          Sign up with Google
                        </Button>
                      </a>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Hero Section */}
        <div className="hidden lg:block lg:w-1/2 bg-gradient-to-r from-blue-600 to-indigo-700">
          <div className="flex flex-col items-center justify-center h-full text-white p-10">
            <h2 className="text-3xl font-bold mb-4">Powerful S3 Management</h2>
            <p className="text-xl mb-6 text-center">
              Organize, share, and manage your cloud storage with our intuitive interface
            </p>
            <div className="space-y-4 w-full max-w-md">
              <div className="flex items-center bg-white bg-opacity-10 p-3 rounded-lg">
                <div className="mr-4 flex-shrink-0 bg-white bg-opacity-20 p-2 rounded-full">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Multi-account support</h3>
                  <p className="text-sm text-white text-opacity-80">Connect and manage multiple AWS accounts</p>
                </div>
              </div>
              <div className="flex items-center bg-white bg-opacity-10 p-3 rounded-lg">
                <div className="mr-4 flex-shrink-0 bg-white bg-opacity-20 p-2 rounded-full">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Secure file sharing</h3>
                  <p className="text-sm text-white text-opacity-80">Share files with expiration dates and password protection</p>
                </div>
              </div>
              <div className="flex items-center bg-white bg-opacity-10 p-3 rounded-lg">
                <div className="mr-4 flex-shrink-0 bg-white bg-opacity-20 p-2 rounded-full">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Batch operations</h3>
                  <p className="text-sm text-white text-opacity-80">Easily move, copy, and delete multiple files at once</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
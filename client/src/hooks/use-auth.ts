import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/lib/types";

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user
  const { 
    data: user, 
    isLoading, 
    error, 
    refetch
  } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 60000 // Refresh auth status every minute
  });

  const isAuthenticated = !!user;

  // Debug authentication status changes
  useEffect(() => {
    console.log("Authentication status changed:", { 
      isAuthenticated, 
      user,
      cookies: document.cookie,
    });
    
    // If authenticated, check for what cookies we have
    if (isAuthenticated) {
      console.log("User is authenticated with cookies:", document.cookie);
    }
  }, [isAuthenticated, user]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      console.log("Attempting login with credentials:", { email: credentials.email });
      
      try {
        // Make the login request with credentials included
        const res = await apiRequest('POST', '/api/auth/login', credentials);
        
        console.log("Login response status:", res.status);
        console.log("Login response headers:", {
          'set-cookie': res.headers.get('set-cookie'),
          'x-session-id': res.headers.get('x-session-id')
        });
        
        // Verify we have a session cookie after login
        const cookies = document.cookie;
        console.log("Cookies after login:", cookies);
        
        // Return the parsed response
        return await res.json();
      } catch (error) {
        console.error("Error during login:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Login successful:", data);
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      // Immediately verify we have an authenticated session
      fetch('/api/auth/me', { 
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      })
        .then(res => {
          console.log("Auth verification after login:", { 
            status: res.status,
            statusText: res.statusText
          });
          if (res.ok) return res.json();
          throw new Error("Failed to verify authentication");
        })
        .then(userData => {
          console.log("Auth verification successful:", userData);
        })
        .catch(err => {
          console.error("Auth verification failed:", err);
        });
      
      // Invalidate all queries to refresh data with the new authentication
      queryClient.clear();
      queryClient.setQueryData(['/api/auth/me'], data);
      
      // Force refresh the page to make sure session cookie is properly set
      if (window.location.pathname === "/login") {
        navigate("/");
      } else {
        window.location.reload();
      }
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: { 
      username: string; 
      email: string; 
      password: string; 
      confirmPassword: string;
    }) => {
      const res = await apiRequest('POST', '/api/auth/register', userData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });
      
      queryClient.setQueryData(['/api/auth/me'], data);
      navigate("/");
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Could not create your account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/logout');
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.invalidateQueries();
      navigate("/login");
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Could not log out",
        variant: "destructive",
      });
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (
    username: string, 
    email: string, 
    password: string, 
    confirmPassword: string
  ) => {
    await registerMutation.mutateAsync({ username, email, password, confirmPassword });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  // Redirect unauthenticated users to login page for protected routes
  useEffect(() => {
    const currentPath = window.location.pathname;
    const publicPaths = ['/login', '/signup', '/shared'];
    
    // Only redirect if not loading and the user is not authenticated
    if (!isLoading && !isAuthenticated && !publicPaths.some(path => currentPath.startsWith(path))) {
      // Make sure we're not on a public shared file page
      if (!currentPath.startsWith('/shared/')) {
        navigate('/login');
      }
    }
  }, [isLoading, isAuthenticated, navigate]);

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

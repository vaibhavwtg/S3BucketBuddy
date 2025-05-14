import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error, isError } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Detect if we got a 401 Unauthorized
  const isUnauthorized = isError && (error as any)?.response?.status === 401;

  return {
    user,
    isLoading,
    error,
    isError,
    isUnauthorized,
    isAuthenticated: !!user,
    
    // Helper for login action
    login: () => {
      window.location.href = "/api/login";
    },
    
    // Helper for logout action
    logout: () => {
      window.location.href = "/api/logout";
    }
  };
}
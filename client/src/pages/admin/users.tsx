import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import { Loader2, ShieldAlert, UserCheck, UserX } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/lib/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  // Fetch all users (admin only)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    onError: (error: Error) => {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view user management",
        variant: "destructive"
      });
    }
  });
  
  // Toggle user active status
  const toggleUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/toggle-status`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      
      toast({
        title: "User status updated",
        description: `User status has been ${selectedUser?.isActive ? 'disabled' : 'enabled'}`,
      });
      
      setConfirmDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user status",
        description: error.message,
        variant: "destructive"
      });
      setConfirmDialogOpen(false);
    }
  });
  
  // Handle toggle user status with confirmation
  const handleToggleUser = (user: User) => {
    setSelectedUser(user);
    setConfirmDialogOpen(true);
  };
  
  // Confirm and execute toggle
  const confirmToggleUser = () => {
    if (selectedUser) {
      toggleUserMutation.mutate(selectedUser.id);
    }
  };
  
  // If not admin, show access denied
  if (currentUser && !currentUser.isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access the user management area.
          </p>
        </div>
      </Layout>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[70vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">User Management</h1>
        </div>
        
        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableCaption>List of all registered users in the system</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Username / Email</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.id}</TableCell>
                  <TableCell>
                    <div>
                      <div>{user.username}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(new Date(user.createdAt))}</TableCell>
                  <TableCell>
                    {user.isAdmin ? (
                      <Badge variant="default">Admin</Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-destructive/20 text-destructive hover:bg-destructive/30">
                        Disabled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={user.isActive ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleUser(user)}
                      disabled={toggleUserMutation.isPending && selectedUser?.id === user.id}
                      className="flex items-center gap-1"
                    >
                      {user.isActive ? (
                        <>
                          <UserX className="h-4 w-4" />
                          <span>Disable</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4" />
                          <span>Enable</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.isActive 
                ? "Disable User Account" 
                : "Enable User Account"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.isActive 
                ? "This will prevent the user from logging in or using the system. You can re-enable the account later."
                : "This will restore the user's access to the system."}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="py-4">
              <p className="mb-2">
                <span className="font-medium">Username:</span> {selectedUser.username}
              </p>
              <p>
                <span className="font-medium">Email:</span> {selectedUser.email}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialogOpen(false)}
              disabled={toggleUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant={selectedUser?.isActive ? "destructive" : "default"}
              onClick={confirmToggleUser}
              disabled={toggleUserMutation.isPending}
            >
              {toggleUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : selectedUser?.isActive ? (
                "Disable User"
              ) : (
                "Enable User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
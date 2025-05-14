import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { generateInitials } from "@/lib/utils";
import { Loader2, MoreHorizontal, Search, UserPlus, Filter, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role: 'user' | 'admin' | 'suspended';
  subscriptionPlan: 'free' | 'basic' | 'premium' | 'business';
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

export function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [planFilter, setPlanFilter] = useState<string | undefined>(undefined);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  // Fetch users with possible filters
  const { data: users, isLoading, isError } = useQuery<User[]>({
    queryKey: ["/api/admin/users", searchQuery, roleFilter, planFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (roleFilter) params.append('role', roleFilter);
      if (planFilter) params.append('plan', planFilter);
      
      const queryString = params.toString();
      const url = `/api/admin/users${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiRequest("GET", url);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Update user role mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string; plan?: string }) => {
      const response = await apiRequest("PUT", `/api/admin/users/${data.userId}`, {
        role: data.role,
        ...(data.plan && { subscriptionPlan: data.plan }),
      });
      if (!response.ok) throw new Error("Failed to update user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "The user has been successfully updated.",
      });
      setOpenEditDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const handleUserUpdate = () => {
    if (!userToEdit) return;
    
    updateUserMutation.mutate({
      userId: userToEdit.id,
      role: userToEdit.role,
      plan: userToEdit.subscriptionPlan,
    });
  };

  // Convert timestamp to readable date
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Get role badge styling
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'user':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get subscription plan badge styling
  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'outline';
      case 'basic':
        return 'secondary';
      case 'premium':
        return 'default';
      case 'business':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading users. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage your users, roles, and subscription plans.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.profileImageUrl || undefined} alt={user.username || "User"} />
                          <AvatarFallback>
                            {generateInitials(user.username || user.firstName || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.username || "Unnamed User"}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPlanBadgeVariant(user.subscriptionPlan)}>
                        {user.subscriptionPlan.charAt(0).toUpperCase() + user.subscriptionPlan.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      {user.isVerified ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800">Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Action menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            setUserToEdit(user);
                            setOpenEditDialog(true);
                          }}>
                            Edit user
                          </DropdownMenuItem>
                          <DropdownMenuItem>View details</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.role === 'suspended' ? (
                            <DropdownMenuItem onClick={() => {
                              updateUserMutation.mutate({
                                userId: user.id,
                                role: 'user'
                              });
                            }}>
                              Unsuspend account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => {
                              updateUserMutation.mutate({
                                userId: user.id,
                                role: 'suspended'
                              });
                            }}>
                              Suspend account
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user role and subscription plan.
            </DialogDescription>
          </DialogHeader>
          
          {userToEdit && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={userToEdit.profileImageUrl || undefined} alt={userToEdit.username || "User"} />
                  <AvatarFallback>
                    {generateInitials(userToEdit.username || userToEdit.firstName || "U")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{userToEdit.username || "User"}</h3>
                  <p className="text-sm text-muted-foreground">{userToEdit.email}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user-role">Role</Label>
                <Select 
                  value={userToEdit.role} 
                  onValueChange={(value) => setUserToEdit({...userToEdit, role: value as any})}
                >
                  <SelectTrigger id="user-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user-plan">Subscription Plan</Label>
                <Select 
                  value={userToEdit.subscriptionPlan} 
                  onValueChange={(value) => setUserToEdit({...userToEdit, subscriptionPlan: value as any})}
                >
                  <SelectTrigger id="user-plan">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleUserUpdate}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
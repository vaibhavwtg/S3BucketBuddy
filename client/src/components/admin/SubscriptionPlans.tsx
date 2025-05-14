import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
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
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, PlusCircle, MoreHorizontal, Check, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  priceMonthly: number; // in cents
  priceYearly: number; // in cents
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  features: Record<string, any>;
  maxAccounts: number;
  maxStorage: number; // in GB
  maxBandwidth: number; // in GB
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

// Schema for plan creation and editing
const planSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().min(1, "Description is required"),
  priceMonthly: z.coerce.number().min(0, "Price must be 0 or higher"),
  priceYearly: z.coerce.number().min(0, "Price must be 0 or higher"),
  stripePriceIdMonthly: z.string().optional(),
  stripePriceIdYearly: z.string().optional(),
  maxAccounts: z.coerce.number().min(1, "Must allow at least 1 account"),
  maxStorage: z.coerce.number().min(1, "Must allow at least 1 GB storage"),
  maxBandwidth: z.coerce.number().min(1, "Must allow at least 1 GB bandwidth"),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().default(0),
  featuresText: z.string().optional(),
});

type PlanFormValues = z.infer<typeof planSchema>;

export function SubscriptionPlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<SubscriptionPlan | null>(null);

  // Initialize form for adding a new plan
  const addPlanForm = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      description: '',
      priceMonthly: 0,
      priceYearly: 0,
      maxAccounts: 1,
      maxStorage: 5,
      maxBandwidth: 10,
      isActive: true,
      sortOrder: 0,
      featuresText: '',
    },
  });

  // Initialize form for editing a plan
  const editPlanForm = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      description: '',
      priceMonthly: 0,
      priceYearly: 0,
      maxAccounts: 1,
      maxStorage: 5,
      maxBandwidth: 10,
      isActive: true,
      sortOrder: 0,
      featuresText: '',
    },
  });

  // Set the edit form values when a plan is selected for editing
  const setEditForm = (plan: SubscriptionPlan) => {
    setPlanToEdit(plan);
    const featuresText = JSON.stringify(plan.features, null, 2);
    
    editPlanForm.reset({
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly / 100, // convert from cents to dollars for display
      priceYearly: plan.priceYearly / 100, // convert from cents to dollars for display
      stripePriceIdMonthly: plan.stripePriceIdMonthly,
      stripePriceIdYearly: plan.stripePriceIdYearly,
      maxAccounts: plan.maxAccounts,
      maxStorage: plan.maxStorage,
      maxBandwidth: plan.maxBandwidth,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      featuresText,
    });
    
    setOpenEditDialog(true);
  };

  // Fetch all subscription plans
  const { data: subscriptionPlans, isLoading, isError } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/admin/subscription-plans"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/subscription-plans");
      if (!response.ok) throw new Error("Failed to fetch subscription plans");
      return response.json();
    },
  });

  // Create a new subscription plan
  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormValues) => {
      // Parse features JSON if provided
      let features = {};
      if (data.featuresText) {
        try {
          features = JSON.parse(data.featuresText);
        } catch (e) {
          throw new Error("Invalid features JSON");
        }
      }

      // Convert prices from dollars to cents for storage
      const priceMonthly = Math.round(data.priceMonthly * 100);
      const priceYearly = Math.round(data.priceYearly * 100);
      
      const response = await apiRequest("POST", "/api/admin/subscription-plans", {
        ...data,
        priceMonthly,
        priceYearly,
        features,
      });
      
      if (!response.ok) throw new Error("Failed to create subscription plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      toast({
        title: "Plan created",
        description: "The subscription plan has been created successfully",
      });
      setOpenAddDialog(false);
      addPlanForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subscription plan",
        variant: "destructive",
      });
    },
  });

  // Update an existing subscription plan
  const updatePlanMutation = useMutation({
    mutationFn: async (data: PlanFormValues & { id: number }) => {
      // Parse features JSON if provided
      let features = {};
      if (data.featuresText) {
        try {
          features = JSON.parse(data.featuresText);
        } catch (e) {
          throw new Error("Invalid features JSON");
        }
      }

      // Convert prices from dollars to cents for storage
      const priceMonthly = Math.round(data.priceMonthly * 100);
      const priceYearly = Math.round(data.priceYearly * 100);
      
      const response = await apiRequest("PUT", `/api/admin/subscription-plans/${data.id}`, {
        ...data,
        priceMonthly,
        priceYearly,
        features,
      });
      
      if (!response.ok) throw new Error("Failed to update subscription plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      toast({
        title: "Plan updated",
        description: "The subscription plan has been updated successfully",
      });
      setOpenEditDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription plan",
        variant: "destructive",
      });
    },
  });

  // Toggle plan activation
  const togglePlanActivationMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/subscription-plans/${id}/toggle`, {
        isActive,
      });
      
      if (!response.ok) throw new Error("Failed to update plan status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      toast({
        title: "Plan status updated",
        description: "The plan status has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update plan status",
        variant: "destructive",
      });
    },
  });

  // Format price for display
  const formatPrice = (cents: number) => {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(dollars);
  };

  // Handle form submission for adding a new plan
  const onAddPlanSubmit = (values: PlanFormValues) => {
    createPlanMutation.mutate(values);
  };

  // Handle form submission for editing a plan
  const onEditPlanSubmit = (values: PlanFormValues) => {
    if (!planToEdit) return;
    
    updatePlanMutation.mutate({
      ...values,
      id: planToEdit.id,
    });
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
          Error loading subscription plans. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>
              Manage your subscription plans and pricing.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setOpenAddDialog(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Yearly</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptionPlans && subscriptionPlans.length > 0 ? (
                subscriptionPlans
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-xs text-muted-foreground max-w-xs truncate">
                          {plan.description}
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(plan.priceMonthly)}</TableCell>
                      <TableCell>{formatPrice(plan.priceYearly)}</TableCell>
                      <TableCell>
                        {plan.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="inline-block p-1 bg-blue-100 text-blue-800 rounded mr-1">
                            {plan.maxAccounts} accounts
                          </span>
                          <span className="inline-block p-1 bg-purple-100 text-purple-800 rounded mr-1">
                            {plan.maxStorage} GB storage
                          </span>
                          <span className="inline-block p-1 bg-amber-100 text-amber-800 rounded">
                            {plan.maxBandwidth} GB bandwidth
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditForm(plan)}>
                              Edit plan
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                togglePlanActivationMutation.mutate({
                                  id: plan.id,
                                  isActive: !plan.isActive,
                                });
                              }}
                            >
                              {plan.isActive ? "Deactivate plan" : "Activate plan"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <p className="text-muted-foreground">No subscription plans found</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setOpenAddDialog(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add your first plan
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add Plan Dialog */}
        <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Subscription Plan</DialogTitle>
              <DialogDescription>
                Create a new subscription plan for your users.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...addPlanForm}>
              <form onSubmit={addPlanForm.handleSubmit(onAddPlanSubmit)} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addPlanForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Basic" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addPlanForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-end justify-between space-y-0 rounded-md border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Make this plan available
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={addPlanForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Perfect for individual users" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addPlanForm.control}
                    name="priceMonthly"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            step="0.01" 
                            placeholder="9.99" 
                          />
                        </FormControl>
                        <FormDescription>
                          Price in USD (will be stored in cents)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addPlanForm.control}
                    name="priceYearly"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yearly Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            step="0.01" 
                            placeholder="99.99" 
                          />
                        </FormControl>
                        <FormDescription>
                          Price in USD (will be stored in cents)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={addPlanForm.control}
                    name="maxAccounts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Accounts</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addPlanForm.control}
                    name="maxStorage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Storage (GB)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addPlanForm.control}
                    name="maxBandwidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Bandwidth (GB)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={addPlanForm.control}
                  name="featuresText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Features (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={5}
                          placeholder='{
  "features": [
    "Secure file uploads",
    "Direct link sharing",
    "24/7 support"
  ]
}'
                        />
                      </FormControl>
                      <FormDescription>
                        Enter features as JSON object
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addPlanForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" />
                      </FormControl>
                      <FormDescription>
                        Lower numbers appear first
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setOpenAddDialog(false)}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createPlanMutation.isPending}
                  >
                    {createPlanMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Plan
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Plan Dialog */}
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Subscription Plan</DialogTitle>
              <DialogDescription>
                Update the details of this subscription plan.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editPlanForm}>
              <form onSubmit={editPlanForm.handleSubmit(onEditPlanSubmit)} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editPlanForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Basic" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editPlanForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-end justify-between space-y-0 rounded-md border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Make this plan available
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editPlanForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Perfect for individual users" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editPlanForm.control}
                    name="priceMonthly"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            step="0.01" 
                            placeholder="9.99" 
                          />
                        </FormControl>
                        <FormDescription>
                          Price in USD (will be stored in cents)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editPlanForm.control}
                    name="priceYearly"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yearly Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number"
                            step="0.01" 
                            placeholder="99.99" 
                          />
                        </FormControl>
                        <FormDescription>
                          Price in USD (will be stored in cents)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editPlanForm.control}
                    name="maxAccounts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Accounts</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editPlanForm.control}
                    name="maxStorage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Storage (GB)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editPlanForm.control}
                    name="maxBandwidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Bandwidth (GB)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editPlanForm.control}
                  name="featuresText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Features (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={5}
                          placeholder='{
  "features": [
    "Secure file uploads",
    "Direct link sharing",
    "24/7 support"
  ]
}'
                        />
                      </FormControl>
                      <FormDescription>
                        Enter features as JSON object
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editPlanForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" />
                      </FormControl>
                      <FormDescription>
                        Lower numbers appear first
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setOpenEditDialog(false)}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={updatePlanMutation.isPending}
                  >
                    {updatePlanMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
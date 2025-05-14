import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Edit } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Validation schema for subscription plan form
const planSchema = z.object({
  id: z.string().min(2, "ID must be at least 2 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  maxAccounts: z.coerce.number().int().min(1, "Must allow at least 1 account"),
  maxStorage: z.coerce.number().int().min(1, "Must allow at least 1 GB of storage"),
  active: z.boolean().default(true),
  features: z.array(z.string()).default([]),
});

type PlanFormValues = z.infer<typeof planSchema>;

// Define SubscriptionPlan type
type SubscriptionPlanType = {
  id: string;
  name: string;
  description: string;
  price: number;
  maxAccounts: number;
  maxStorage: number;
  active: boolean;
  features: string[];
  isDefault?: boolean;
};

// Predefined sample plans - in a real app, these would come from a database
const samplePlans: SubscriptionPlanType[] = [
  {
    id: "free",
    name: "Free",
    description: "Basic plan for personal use",
    price: 0,
    maxAccounts: 1,
    maxStorage: 5,
    active: true,
    features: ["1 S3 Account", "5 GB Storage", "Basic Support"],
    isDefault: true,
  },
  {
    id: "basic",
    name: "Basic",
    description: "Great for individuals and small teams",
    price: 9.99,
    maxAccounts: 3,
    maxStorage: 50,
    active: true,
    features: ["3 S3 Accounts", "50 GB Storage", "Email Support", "Advanced Sharing"],
  },
  {
    id: "premium",
    name: "Premium",
    description: "Perfect for growing businesses",
    price: 29.99,
    maxAccounts: 10,
    maxStorage: 200,
    active: true,
    features: ["10 S3 Accounts", "200 GB Storage", "Priority Support", "Advanced Analytics"],
  },
  {
    id: "business",
    name: "Business",
    description: "Enterprise-grade solution",
    price: 99.99,
    maxAccounts: 50,
    maxStorage: 1000,
    active: true,
    features: ["50 S3 Accounts", "1 TB Storage", "24/7 Support", "Advanced Security", "Custom Branding"],
  },
];

export function SubscriptionPlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [feature, setFeature] = useState("");
  
  // Initialize form
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      id: "",
      name: "",
      description: "",
      price: 0,
      maxAccounts: 1,
      maxStorage: 1,
      active: true,
      features: [],
    },
  });

  // In a real implementation, we would fetch subscription plans from the API
  const { data: plans = samplePlans, isLoading } = useQuery<SubscriptionPlanType[]>({
    queryKey: ['/api/admin/subscription-plans'],
    // In the absence of a real endpoint, just provide the predefined plans
    queryFn: async () => {
      // This would be replaced with an actual API call in a real application
      return new Promise<SubscriptionPlanType[]>(resolve => setTimeout(() => resolve(samplePlans), 500));
    },
  });

  // Reset form for adding a new plan
  const resetForm = () => {
    form.reset({
      id: "",
      name: "",
      description: "",
      price: 0,
      maxAccounts: 1,
      maxStorage: 1,
      active: true,
      features: [],
    });
  };

  // Set up form for editing an existing plan
  const setupEditForm = (plan: SubscriptionPlanType) => {
    form.reset({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      maxAccounts: plan.maxAccounts,
      maxStorage: plan.maxStorage,
      active: plan.active,
      features: plan.features || [],
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  // Handle adding a new feature
  const addFeature = () => {
    if (feature.trim() !== "") {
      const currentFeatures = form.getValues("features") || [];
      form.setValue("features", [...currentFeatures, feature.trim()]);
      setFeature("");
    }
  };

  // Handle removing a feature
  const removeFeature = (index: number) => {
    const currentFeatures = form.getValues("features") || [];
    form.setValue(
      "features",
      currentFeatures.filter((_, i) => i !== index)
    );
  };

  // Submit handler for form
  const onSubmit = (data: PlanFormValues) => {
    // In a real app, this would make an API call to create/update the plan
    toast({
      title: isEditing ? "Plan Updated" : "Plan Created",
      description: `The ${data.name} plan has been ${isEditing ? "updated" : "created"} successfully.`,
    });
    
    // Close dialog and reset form
    setIsDialogOpen(false);
    resetForm();
    setIsEditing(false);
    
    // Invalidate the plans query to refetch data
    queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-plans'] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Subscription Plans</CardTitle>
          <CardDescription>
            Manage subscription plans for users
          </CardDescription>
        </div>
        <Button onClick={() => {
          resetForm();
          setIsEditing(false);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Plan
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan: SubscriptionPlanType) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">{plan.description}</div>
                    </TableCell>
                    <TableCell>
                      {plan.price === 0 ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        <span>${plan.price.toFixed(2)}/mo</span>
                      )}
                    </TableCell>
                    <TableCell>{plan.maxAccounts}</TableCell>
                    <TableCell>{plan.maxStorage} GB</TableCell>
                    <TableCell>
                      <Badge variant={plan.active ? "default" : "secondary"}>
                        {plan.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setupEditForm(plan)}
                          disabled={plan.isDefault}
                          title={plan.isDefault ? "Default plan cannot be edited" : "Edit plan"}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {plans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No subscription plans found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Plan Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Subscription Plan" : "Create New Subscription Plan"}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Update the details of this subscription plan" 
                : "Add a new subscription plan to offer to users"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., basic" 
                          {...field} 
                          disabled={isEditing}
                        />
                      </FormControl>
                      <FormDescription>
                        Unique identifier for the plan
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Basic Plan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what this plan offers" 
                        className="resize-none" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($/month)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxAccounts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Accounts</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxStorage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Storage (GB)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Make this plan available to users
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
              <div>
                <FormLabel>Features</FormLabel>
                <div className="flex items-center space-x-2 mt-1.5 mb-3">
                  <Input
                    placeholder="Add a feature"
                    value={feature}
                    onChange={(e) => setFeature(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                  />
                  <Button type="button" onClick={addFeature}>
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.watch("features")?.map((feat, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <span>{feat}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing ? "Save Changes" : "Create Plan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
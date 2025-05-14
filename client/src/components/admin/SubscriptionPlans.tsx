import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, CreditCard, Edit, Trash } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define the subscription plan schema
const planSchema = z.object({
  name: z.string().min(2, { message: "Plan name must be at least 2 characters" }),
  price: z.number().min(0, { message: "Price must be non-negative" }), 
  description: z.string().optional(),
  maxAccounts: z.number().int().min(1, { message: "Max accounts must be at least 1" }),
  maxStorage: z.number().int().min(1, { message: "Max storage must be at least 1 GB" }),
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  
  // Initialize form with the schema
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      price: 0,
      description: "",
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
      name: "",
      price: 0,
      description: "",
      maxAccounts: 1,
      maxStorage: 1,
      active: true,
      features: [],
    });
    setEditingPlan(null);
  };

  // Set up form for editing an existing plan
  const setupEditForm = (plan: any) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      price: plan.price,
      description: plan.description || "",
      maxAccounts: plan.maxAccounts,
      maxStorage: plan.maxStorage,
      active: plan.active,
      features: plan.features,
    });
    setIsAddDialogOpen(true);
  };

  // Handle form submission
  const onSubmit = (data: PlanFormValues) => {
    console.log("Submitted plan:", data);
    
    // In a real implementation, we would send this to the API
    toast({
      title: editingPlan ? "Plan Updated" : "Plan Created",
      description: `The ${data.name} plan has been ${editingPlan ? "updated" : "created"} successfully.`,
    });
    
    setIsAddDialogOpen(false);
    resetForm();
    
    // In a real implementation, we would refetch the plans or update the cache
  };

  // Add a custom input for features (comma-separated)
  const [featureInput, setFeatureInput] = useState("");
  const addFeature = () => {
    if (featureInput.trim()) {
      const currentFeatures = form.getValues("features") || [];
      form.setValue("features", [...currentFeatures, featureInput.trim()]);
      setFeatureInput("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Plans
              </CardTitle>
              <CardDescription>
                Manage pricing tiers and subscription features
              </CardDescription>
            </div>
            <DialogTrigger asChild onClick={resetForm}>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Plan
              </Button>
            </DialogTrigger>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Pricing</TableHead>
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
        </CardContent>
      </Card>

      {/* Dialog for adding/editing subscription plans */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Subscription Plan" : "Add New Subscription Plan"}</DialogTitle>
            <DialogDescription>
              {editingPlan 
                ? "Update the details of this subscription plan."
                : "Create a new subscription plan for your customers."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Price ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="9.99"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
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
                      <Input placeholder="A short description of the plan" {...field} />
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
                      <FormLabel>Max S3 Accounts</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
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
                        <Input
                          type="number"
                          min="1"
                          placeholder="5"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Whether this plan is available for users to subscribe to.
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

              {/* Features section */}
              <div className="space-y-2">
                <Label>Plan Features</Label>
                <div className="flex gap-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    placeholder="Add a feature, e.g., '24/7 Support'"
                  />
                  <Button type="button" onClick={addFeature} size="sm">
                    Add
                  </Button>
                </div>

                <div className="mt-2 space-y-2">
                  {form.watch("features").map((feature, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-sm">
                      <span>{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentFeatures = [...form.getValues("features")];
                          currentFeatures.splice(index, 1);
                          form.setValue("features", currentFeatures);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPlan ? "Update Plan" : "Create Plan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
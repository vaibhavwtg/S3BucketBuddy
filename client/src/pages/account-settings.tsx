import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { S3Account, UserSettings } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTheme } from "@/components/ui/theme-provider";
import { apiRequest } from "@/lib/queryClient";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const settingsSchema = z.object({
  theme: z.string(),
  defaultAccountId: z.number().nullable(),
  notifications: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AccountSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isEditAccountId, setIsEditAccountId] = useState<number | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState<number | null>(null);

  // Fetch user's S3 accounts
  const { data: accounts = [] } = useQuery<S3Account[]>({
    queryKey: ['/api/s3-accounts'],
    enabled: !!user,
  });

  // Fetch user settings
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ['/api/user-settings'],
    enabled: !!user,
  });

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
    },
  });

  // Settings form
  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      theme: settings?.theme || theme,
      defaultAccountId: settings?.defaultAccountId || null,
      notifications: settings?.notifications ?? true,
    },
  });

  // Update form values when settings are loaded
  useState(() => {
    if (settings) {
      settingsForm.reset({
        theme: settings.theme,
        defaultAccountId: settings.defaultAccountId || null,
        notifications: settings.notifications,
      });
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      const res = await apiRequest("PUT", "/api/user-settings", values);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Settings updated",
        description: "Your settings have been saved",
      });
      
      // Update theme if changed
      if (data.theme !== theme) {
        setTheme(data.theme);
      }
      
      // Refresh settings
      queryClient.setQueryData(['/api/user-settings'], data);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/s3-accounts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "S3 account has been removed successfully",
      });
      
      // Refresh accounts and settings
      queryClient.invalidateQueries({ queryKey: ['/api/s3-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-settings'] });
      setIsDeleteLoading(null);
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
      setIsDeleteLoading(null);
    },
  });

  // Handle settings submit
  function onSettingsSubmit(values: SettingsFormValues) {
    updateSettingsMutation.mutate(values);
  }

  // Handle account deletion
  const handleDeleteAccount = (id: number) => {
    if (confirm("Are you sure you want to delete this S3 account? This action cannot be undone.")) {
      setIsDeleteLoading(id);
      deleteAccountMutation.mutate(id);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        
        <Tabs defaultValue="general">
          <TabsList className="mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="accounts">S3 Accounts</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          {/* General Settings */}
          <TabsContent value="general">
            <div className="grid gap-6">
              {/* Profile Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>
                    Update your personal information.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="johndoe" {...field} disabled />
                            </FormControl>
                            <FormDescription>
                              Your username cannot be changed.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="johndoe@example.com" {...field} disabled />
                            </FormControl>
                            <FormDescription>
                              Your email cannot be changed.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              {/* Appearance Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize how WickedFiles looks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...settingsForm}>
                    <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
                      <FormField
                        control={settingsForm.control}
                        name="theme"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Theme</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select theme" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choose between light, dark, or system theme.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={settingsForm.control}
                        name="notifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Notifications
                              </FormLabel>
                              <FormDescription>
                                Receive notifications about file activity.
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
                      
                      <Button type="submit" disabled={updateSettingsMutation.isPending}>
                        {updateSettingsMutation.isPending ? "Saving..." : "Save changes"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* S3 Accounts */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <CardTitle>Amazon S3 Accounts</CardTitle>
                <CardDescription>
                  Manage your connected S3 storage accounts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accounts.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                      <i className="ri-amazon-line text-4xl text-muted-foreground mb-4"></i>
                      <h3 className="text-lg font-medium mb-2">No S3 Accounts</h3>
                      <p className="text-muted-foreground mb-4">
                        You haven't added any Amazon S3 accounts yet.
                      </p>
                      <Button onClick={() => setIsAddAccountOpen(true)}>
                        Add S3 Account
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Form {...settingsForm}>
                        <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)}>
                          <FormField
                            control={settingsForm.control}
                            name="defaultAccountId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Default Account</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(parseInt(value))} 
                                  value={field.value?.toString() || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select default account" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {accounts.map((account) => (
                                      <SelectItem 
                                        key={account.id} 
                                        value={account.id.toString()}
                                      >
                                        {account.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  This account will be used by default when you open the app.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            disabled={updateSettingsMutation.isPending}
                            className="mt-4"
                          >
                            {updateSettingsMutation.isPending ? "Saving..." : "Save default account"}
                          </Button>
                        </form>
                      </Form>
                      
                      <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-medium mb-4">Your S3 Accounts</h3>
                        <div className="space-y-4">
                          {accounts.map((account) => (
                            <div 
                              key={account.id} 
                              className="flex items-center justify-between p-4 rounded-lg border"
                            >
                              <div className="flex items-center">
                                <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center mr-4">
                                  <i className="ri-amazon-line text-primary"></i>
                                </div>
                                <div>
                                  <h4 className="font-medium">{account.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {account.region} • 
                                    {account.accessKeyId.substring(0, 4)}...
                                    {account.accessKeyId.substring(account.accessKeyId.length - 4)}
                                  </p>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <i className="ri-more-2-line"></i>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setIsEditAccountId(account.id)}>
                                    <i className="ri-pencil-line mr-2"></i>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteAccount(account.id)}
                                    className="text-destructive"
                                  >
                                    {isDeleteLoading === account.id ? (
                                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                                    ) : (
                                      <i className="ri-delete-bin-line mr-2"></i>
                                    )}
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))}
                        </div>
                        
                        <Button 
                          className="w-full mt-4" 
                          onClick={() => setIsAddAccountOpen(true)}
                        >
                          <i className="ri-add-line mr-2"></i>
                          Add Another Account
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Manage your account security settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Change Password</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Update your password to keep your account secure.
                    </p>
                    <Button variant="outline" disabled>
                      Change Password
                    </Button>
                  </div>
                  
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium mb-1">Two-Factor Authentication</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add an extra layer of security to your account.
                    </p>
                    <Button variant="outline" disabled>
                      Enable 2FA
                    </Button>
                  </div>
                  
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium mb-1">Sessions</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage your active sessions and sign out from other devices.
                    </p>
                    <Button variant="outline" disabled>
                      Manage Sessions
                    </Button>
                  </div>
                  
                  <div className="border-t pt-6">
                    <h3 className="text-lg text-destructive font-medium mb-1">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete your account and all associated data.
                    </p>
                    <Button variant="destructive" disabled>
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Add Account Dialog */}
      <AddAccountDialog 
        open={isAddAccountOpen} 
        onOpenChange={setIsAddAccountOpen} 
      />
    </Layout>
  );
}

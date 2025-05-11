import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { S3Account } from "@/lib/types";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AccountManager() {
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<S3Account | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery<S3Account[]>({
    queryKey: ['/api/s3-accounts'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const res = await apiRequest("DELETE", `/api/s3-accounts/${accountId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "The S3 account has been removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/s3-accounts'] });
      setAccountToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error deleting account",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAccount = (account: S3Account) => {
    setAccountToDelete(account);
  };

  const confirmDelete = () => {
    if (accountToDelete) {
      deleteMutation.mutate(accountToDelete.id);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">S3 Account Manager</h1>
          <Button onClick={() => setIsAddAccountOpen(true)}>
            <i className="ri-add-line mr-2"></i>
            Add Account
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <div className="flex flex-col items-center">
              <div className="animate-spin text-primary mb-4">
                <i className="ri-loader-4-line text-4xl"></i>
              </div>
              <p>Loading accounts...</p>
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border rounded-lg border-dashed">
            <i className="ri-database-2-line text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-lg font-medium mb-2">No S3 Accounts</h3>
            <p className="text-center text-muted-foreground mb-4">
              You haven't added any Amazon S3 accounts yet. Add an account to start managing your S3 buckets.
            </p>
            <Button onClick={() => setIsAddAccountOpen(true)}>
              Add Account
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account: S3Account) => (
              <Card key={account.id}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <i className="ri-amazon-line text-2xl mr-2 text-orange-500"></i>
                    {account.name}
                  </CardTitle>
                  <CardDescription>
                    Region: {account.region}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <i className="ri-key-2-line text-muted-foreground mr-2"></i>
                      <span className="text-sm">
                        {account.accessKeyId.substring(0, 4)}...{account.accessKeyId.substring(account.accessKeyId.length - 4)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <i className="ri-bucket-line text-muted-foreground mr-2"></i>
                      <span className="text-sm">
                        {account.defaultBucket || "No default bucket"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <i className="ri-time-line text-muted-foreground mr-2"></i>
                      <span className="text-sm">
                        Added: {formatDate(account.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = `/browser/${account.id}`}
                  >
                    <i className="ri-folder-open-line mr-2"></i>
                    Browse
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDeleteAccount(account)}
                  >
                    <i className="ri-delete-bin-line mr-2"></i>
                    Remove
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddAccountDialog
        open={isAddAccountOpen}
        onOpenChange={setIsAddAccountOpen}
        requireBucketSelection={true}
      />

      <AlertDialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the S3 account "{accountToDelete?.name}".
              Your actual AWS account and its data won't be affected, but you'll need to add
              the account again to access it from this application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
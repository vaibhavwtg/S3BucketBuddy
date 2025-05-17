import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: string;
  initialKey: string;
  initialName: string;
  onRename: (sourceKey: string, newKey: string) => Promise<void>;
}

const renameSchema = z.object({
  newName: z.string().min(1, "New filename is required"),
});

type RenameFormValues = z.infer<typeof renameSchema>;

export function RenameDialog({
  open,
  onOpenChange,
  bucket,
  initialKey,
  initialName,
  onRename,
}: RenameDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RenameFormValues>({
    resolver: zodResolver(renameSchema),
    defaultValues: {
      newName: initialName,
    },
  });

  async function onSubmit(values: RenameFormValues) {
    setIsSubmitting(true);
    try {
      // Get folder path from original key
      const pathParts = initialKey.split('/');
      pathParts.pop(); // Remove the filename
      const folderPath = pathParts.join('/');
      
      // Create new full path
      const newKey = folderPath ? `${folderPath}/${values.newName}` : values.newName;
      
      await onRename(initialKey, newKey);
      onOpenChange(false);
    } catch (error) {
      console.error("Error renaming file:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
          <DialogDescription>
            Enter a new name for the file in bucket "{bucket}".
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New filename</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter new filename" 
                      {...field} 
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Renaming..." : "Rename"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
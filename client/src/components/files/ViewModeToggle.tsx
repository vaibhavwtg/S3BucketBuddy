import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ViewModeToggleProps {
  viewMode: 'grid' | 'list';
  onChange: (value: 'grid' | 'list') => void;
  savePreference?: boolean;
}

export function ViewModeToggle({ viewMode, onChange, savePreference = true }: ViewModeToggleProps) {
  const { toast } = useToast();
  
  // Save preference to user settings if enabled
  const saveViewModeMutation = useMutation({
    mutationFn: async (newViewMode: 'grid' | 'list') => {
      const res = await apiRequest("PATCH", "/api/user-settings", {
        viewMode: newViewMode
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save view preference",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleChange = (value: string) => {
    // Ensure the value is either 'grid' or 'list'
    const newViewMode = value as 'grid' | 'list';
    
    // Update local state via the onChange callback
    onChange(newViewMode);
    
    // Save to user settings if enabled
    if (savePreference) {
      saveViewModeMutation.mutate(newViewMode);
    }
  };

  return (
    <ToggleGroup 
      type="single" 
      value={viewMode} 
      onValueChange={handleChange} 
      variant="outline"
      className="h-8"
    >
      <ToggleGroupItem 
        value="grid" 
        aria-label="Grid view"
        className="h-8 w-8 sm:h-9 sm:w-9 p-0 flex items-center justify-center"
      >
        <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="list" 
        aria-label="List view"
        className="h-8 w-8 sm:h-9 sm:w-9 p-0 flex items-center justify-center"
      >
        <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
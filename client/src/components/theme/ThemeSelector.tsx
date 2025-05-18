import React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Laptop, Palette } from "lucide-react";

const themes = [
  { name: "Light", value: "light", icon: Sun },
  { name: "Dark", value: "dark", icon: Moon },
  { name: "System", value: "system", icon: Laptop },
  { name: "Ocean", value: "ocean", icon: Palette },
  { name: "Sunset", value: "sunset", icon: Palette },
  { name: "Forest", value: "forest", icon: Palette },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  
  // Find the current theme object
  const currentTheme = themes.find(t => t.value === theme) || themes[0];
  const ThemeIcon = currentTheme.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
          <ThemeIcon className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((t) => {
          const ThemeIcon = t.icon;
          return (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={theme === t.value ? "bg-accent" : ""}
            >
              <ThemeIcon className="mr-2 h-4 w-4" />
              <span>{t.name}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
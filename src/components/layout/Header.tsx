import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import logoIconBlack from '@/assets/logo-icon-black.png';
import logoIconWhite from '@/assets/logo-icon-white.png';
import { useTheme } from '@/hooks/useTheme';

export const Header = () => {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();

  const getCurrentLogoIcon = () => {
    if (theme === 'dark') return logoIconWhite;
    if (theme === 'light') return logoIconBlack;
    // For system theme, check if dark mode is active
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? logoIconWhite : logoIconBlack;
  };

  return (
    <header className="border-b bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={getCurrentLogoIcon()} alt="CRM Box" className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold text-primary">CRM Box</h1>
            <p className="text-sm text-muted-foreground">Sistema de gestão imobiliária</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              {user?.email}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
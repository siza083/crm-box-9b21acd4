import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Building, 
  Workflow,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Pipeline', href: '/pipeline', icon: Workflow },
  { name: 'Contatos', href: '/contacts', icon: Users },
  { name: 'Imóveis', href: '/properties', icon: Building },
];

export const Sidebar = ({ collapsed, setCollapsed }: SidebarProps) => {
  return (
    <div className={cn(
      "bg-card border-r transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto flex"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                collapsed && "justify-center"
              )
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">{item.name}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
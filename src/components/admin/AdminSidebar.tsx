import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Briefcase, Users, Building2, Settings, LogOut, Shield, Bell,
  UserCog, Scale
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Cases", icon: Briefcase, href: "/admin/cases" },
  { label: "Clients", icon: Building2, href: "/admin/clients" },
  { label: "Counsel", icon: Scale, href: "/admin/counsel" },
  { label: "Users", icon: UserCog, href: "/admin/users", superAdminOnly: true },
  { label: "Settings", icon: Settings, href: "/admin/settings", superAdminOnly: true },
];

export default function AdminSidebar() {
  const { pathname } = useLocation();
  const { signOut, profile, isSuperAdmin } = useAuth();

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-2 text-sidebar-primary">
          <Shield className="h-6 w-6" />
          <span className="text-xl font-bold tracking-tight">Evict OS</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems
          .filter((item) => !item.superAdminOnly || isSuperAdmin)
          .map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="px-3 py-2 text-xs text-sidebar-foreground/50 truncate">
          {profile?.full_name || profile?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}

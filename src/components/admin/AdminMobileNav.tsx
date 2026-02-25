import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Shield, LayoutDashboard, Briefcase, Building2, UserCog, Settings, LogOut, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Cases", icon: Briefcase, href: "/admin/cases" },
  { label: "Clients", icon: Building2, href: "/admin/clients" },
  { label: "Counsel", icon: Scale, href: "/admin/counsel" },
  { label: "Users", icon: UserCog, href: "/admin/users", superAdminOnly: true },
  { label: "Settings", icon: Settings, href: "/admin/settings", superAdminOnly: true },
];

export default function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { signOut, isSuperAdmin } = useAuth();

  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-card">
      <Link to="/admin" className="flex items-center gap-2 text-primary">
        <Shield className="h-5 w-5" />
        <span className="font-bold">EvictFlow</span>
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="p-5 border-b">
            <span className="flex items-center gap-2 text-primary font-bold">
              <Shield className="h-5 w-5" />EvictFlow
            </span>
          </div>
          <nav className="p-3 space-y-1">
            {navItems.filter(i => !i.superAdminOnly || isSuperAdmin).map(item => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium",
                  pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                    ? "bg-accent text-primary" : "text-muted-foreground hover:bg-accent"
                )}
              >
                <item.icon className="h-4 w-4" />{item.label}
              </Link>
            ))}
          </nav>
          <div className="p-3 border-t mt-auto">
            <Button variant="ghost" size="sm" onClick={() => { signOut(); setOpen(false); }} className="w-full justify-start">
              <LogOut className="h-4 w-4 mr-2" />Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

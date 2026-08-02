import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Scale, LayoutDashboard, Briefcase, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Queue", icon: LayoutDashboard, href: "/attorney" },
  { label: "Matters", icon: Briefcase, href: "/attorney/matters" },
];

export default function AttorneyLayout() {
  const { pathname } = useLocation();
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/attorney" className="flex items-center gap-2 text-primary">
            <Scale className="h-5 w-5" />
            <span className="font-bold">Evict OS</span>
            <span className="text-xs text-muted-foreground font-normal hidden sm:inline">Attorney portal</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  pathname === item.href || (item.href !== "/attorney" && pathname.startsWith(item.href))
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="hidden sm:inline">{item.label}</span>
                <item.icon className="h-4 w-4 sm:hidden" />
              </Link>
            ))}
            <span className="hidden md:inline text-sm text-muted-foreground mx-2">{profile?.full_name}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="container p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
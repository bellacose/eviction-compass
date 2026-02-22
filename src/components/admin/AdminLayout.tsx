import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminMobileNav from "./AdminMobileNav";

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminMobileNav />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

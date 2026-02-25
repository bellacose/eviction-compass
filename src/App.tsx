import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

// Admin
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import CasesList from "./pages/admin/CasesList";
import CaseDetail from "./pages/admin/CaseDetail";
import NewCase from "./pages/admin/NewCase";
import ClientsList from "./pages/admin/ClientsList";
import ClientDetail from "./pages/admin/ClientDetail";
import UsersManagement from "./pages/admin/UsersManagement";
import AdminSettings from "./pages/admin/Settings";
import CounselList from "./pages/admin/CounselList";

// Client
import ClientLayout from "./components/client/ClientLayout";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientCasesList from "./pages/client/ClientCasesList";
import ClientCaseDetail from "./pages/client/ClientCaseDetail";
import ClientProfile from "./pages/client/ClientProfile";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading, isAdmin, isClient } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Role-based routing
  const defaultPath = isAdmin ? "/admin" : isClient ? "/client" : "/login";

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultPath} replace />} />
      <Route path="/login" element={<Navigate to={defaultPath} replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Admin routes */}
      {isAdmin && (
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="cases" element={<CasesList />} />
          <Route path="cases/new" element={<NewCase />} />
          <Route path="cases/:id" element={<CaseDetail />} />
          <Route path="clients" element={<ClientsList />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="counsel" element={<CounselList />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      )}

      {/* Client routes */}
      {isClient && (
        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<ClientDashboard />} />
          <Route path="cases" element={<ClientCasesList />} />
          <Route path="cases/:id" element={<ClientCaseDetail />} />
          <Route path="profile" element={<ClientProfile />} />
        </Route>
      )}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

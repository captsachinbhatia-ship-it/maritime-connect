import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { ConfigError } from "@/components/ConfigError";
import Login from "./pages/Login";
import AccountSecurity from "./pages/AccountSecurity";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Contacts from "./pages/Contacts";
import Enquiries from "./pages/Enquiries";
import Reporting from "./pages/Reporting";
import MyFollowups from "./pages/MyFollowups";
import FollowupsOversight from "./pages/FollowupsOversight";
import AdminUsers from "./pages/AdminUsers";
import DailyWorkDone from "./pages/DailyWorkDone";
import BulkImport from "./pages/BulkImport";
import CompleteProfile from "./pages/CompleteProfile";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  if (!isSupabaseConfigured) {
    return <ConfigError />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="companies" element={<Companies />} />
                <Route path="contacts" element={<Contacts />} />
                <Route path="followups" element={<MyFollowups />} />
                <Route path="followups-oversight" element={<FollowupsOversight />} />
                <Route path="admin-users" element={<AdminUsers />} />
                <Route path="admin/daily-work-done" element={<DailyWorkDone />} />
                <Route path="unassigned-contacts" element={<Navigate to="/contacts" replace />} />
                <Route path="enquiries" element={<Enquiries />} />
                <Route path="reporting" element={<Reporting />} />
                <Route path="bulk-import" element={<BulkImport />} />
                <Route path="account/security" element={<AccountSecurity />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

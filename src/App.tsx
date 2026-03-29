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
import ContactsV2 from "./pages/ContactsV2";
import Enquiries from "./pages/Enquiries";
import EnquiryDetail from "./pages/EnquiryDetail";
import Reporting from "./pages/Reporting";
import MyFollowups from "./pages/MyFollowups";
import FollowupsOversight from "./pages/FollowupsOversight";
import AdminUsers from "./pages/AdminUsers";
import DailyWorkDone from "./pages/DailyWorkDone";
import AdminSummary from "./pages/AdminSummary";
import BulkImport from "./pages/BulkImport";
import AllInteractions from "./pages/AllInteractions";
import AllFollowups from "./pages/AllFollowups";
import Documents from "./pages/Documents";
import Performance from "./pages/Performance";
import MapView from "./pages/MapView";
import MarketReports from "./pages/MarketReports";
import MarketBaltic from "./pages/MarketBaltic";
import MarketBunker from "./pages/MarketBunker";
import { AdminRoute } from "./components/AdminRoute";
import BalticRoutes from "./pages/BalticRoutes";

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
                <Route path="contacts" element={<ContactsV2 />} />
                <Route path="contacts-v2" element={<ContactsV2 />} />
                <Route path="contacts-old" element={<Contacts />} />
                <Route path="contacts/bulk-import" element={<BulkImport />} />
                <Route path="followups" element={<Navigate to="/follow-ups" replace />} />
                <Route path="followups-oversight" element={<FollowupsOversight />} />
                <Route path="admin-users" element={<AdminUsers />} />
                <Route path="admin/daily-work-done" element={<DailyWorkDone />} />
                <Route path="admin/summary" element={<AdminSummary />} />
                <Route path="unassigned-contacts" element={<Navigate to="/contacts" replace />} />
                <Route path="enquiries" element={<Enquiries />} />
                <Route path="enquiries/new" element={<Navigate to="/enquiries" replace />} />
                <Route path="enquiries/new-cargo" element={<Navigate to="/enquiries" replace />} />
                <Route path="enquiries/new-vessel" element={<Navigate to="/enquiries" replace />} />
                <Route path="enquiries/:id" element={<EnquiryDetail />} />
                <Route path="documents" element={<Documents />} />
                <Route path="performance" element={<Performance />} />
                <Route path="map" element={<MapView />} />
                <Route path="market-reports" element={<MarketReports />} />
                <Route path="market-reports/fixtures" element={<MarketReports />} />
                <Route path="market-reports/baltic" element={<MarketBaltic />} />
                <Route path="market-reports/bunker" element={<MarketBunker />} />
                <Route element={<AdminRoute />}>
                  <Route path="reporting" element={<Reporting />} />
                </Route>
                <Route path="interactions" element={<AllInteractions />} />
                <Route path="follow-ups" element={<AllFollowups />} />
                <Route path="bulk-import" element={<Navigate to="/contacts/bulk-import" replace />} />
                <Route path="baltic-routes" element={<BalticRoutes />} />
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

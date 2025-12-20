import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { PlanThemeProvider } from "@/components/theme/PlanThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AppLayout } from "./components/layout/AppLayout";
import { AdminLayout } from "./components/admin/AdminLayout";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import VerifyEmail from "./pages/VerifyEmail";
import SetPassword from "./pages/SetPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import SalesFunnel from "./pages/SalesFunnel";
import OperationalFlow from "./pages/OperationalFlow";
import Clients from "./pages/Clients";
import NewClient from "./pages/NewClient";
import ClientDetail from "./pages/ClientDetail";
import Academia from "./pages/Academia";
import Team from "./pages/Team";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";
import Upgrade from "./pages/Upgrade";
import Pricing from "./pages/Pricing";
import Onboarding from "./pages/Onboarding";
import SelectPlan from "./pages/SelectPlan";
import Subscription from "./pages/Subscription";
import Notifications from "./pages/Notifications";
import SupportFeedback from "./pages/SupportFeedback";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminFeedbacks from "./pages/admin/AdminFeedbacks";
import AdminSupport from "./pages/admin/AdminSupport";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <PlanThemeProvider>
              <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/set-password" element={<SetPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/select-plan" element={<SelectPlan />} />
              <Route path="/app/onboarding" element={<Onboarding />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="sales-funnel" element={
                  <RoleProtectedRoute requireSalesFunnel>
                    <SalesFunnel />
                  </RoleProtectedRoute>
                } />
                <Route path="operational-flow" element={
                  <RoleProtectedRoute requireOperationalFlow>
                    <OperationalFlow />
                  </RoleProtectedRoute>
                } />
                <Route path="clients" element={
                  <RoleProtectedRoute requireClients>
                    <Clients />
                  </RoleProtectedRoute>
                } />
                <Route path="clients/:clientId" element={<ClientDetail />} />
                <Route path="new-client" element={
                  <RoleProtectedRoute allowedRoles={['admin', 'sales']}>
                    <NewClient />
                  </RoleProtectedRoute>
                } />
                <Route path="academia" element={<Academia />} />
                <Route path="team" element={
                  <RoleProtectedRoute requireTeam>
                    <Team />
                  </RoleProtectedRoute>
                } />
                <Route path="ai-assistant" element={<AIAssistant />} />
                <Route path="settings" element={
                  <RoleProtectedRoute requireSettings>
                    <Settings />
                  </RoleProtectedRoute>
                } />
                <Route path="subscription" element={
                  <RoleProtectedRoute requireSubscription>
                    <Subscription />
                  </RoleProtectedRoute>
                } />
                <Route path="notifications" element={<Notifications />} />
                <Route path="support" element={<SupportFeedback />} />
                <Route path="upgrade" element={<Upgrade />} />
              </Route>
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="feedbacks" element={<AdminFeedbacks />} />
                <Route path="support" element={<AdminSupport />} />
              </Route>
              <Route path="/not-found" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </PlanThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
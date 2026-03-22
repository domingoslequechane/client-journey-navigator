import { Toaster } from "@/components/ui/toaster";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { PlanThemeProvider } from "@/components/theme/PlanThemeProvider";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdminLayout } from "./components/admin/AdminLayout";
import { InstallPromptBanner } from "./components/pwa/InstallPromptBanner";
import { ReloadPrompt } from "./components/pwa/ReloadPrompt";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import VerifyEmail from "./pages/VerifyEmail";
import SetPassword from "./pages/SetPassword";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import Demo from "./pages/Demo";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import { Navigate } from "react-router-dom";
import Clients from "./pages/Clients";
import NewClient from "./pages/NewClient";
import EditClient from "./pages/EditClient";
import ClientDetail from "./pages/ClientDetail";
import Academia from "./pages/Academia";
import Team from "./pages/Team";
import AgenteQIA from "./pages/AgenteQIA";
import LinkTreeEditor from "./pages/LinkTreeEditor";
import LinkTreeDashboard from "./pages/LinkTreeDashboard";
import StudioDashboard from "./pages/studio/StudioDashboard";
import Settings from "./pages/Settings";
import Upgrade from "./pages/Upgrade";
import Pricing from "./pages/Pricing";
import Onboarding from "./pages/Onboarding";
import SelectPlan from "./pages/SelectPlan";
import SelectOrganization from "./pages/SelectOrganization";
import Subscription from "./pages/Subscription";
import Notifications from "./pages/Notifications";
import SupportFeedback from "./pages/SupportFeedback";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminFeedbacks from "./pages/admin/AdminFeedbacks";
import AdminSupport from "./pages/admin/AdminSupport";
import PartnerProgram from "./pages/PartnerProgram";
import LinkTreePublic from "./pages/LinkTreePublic";
import { FinanceTransactions, FinanceProjects, FinanceGoals, FinanceReports } from "./pages/finance";
import Editorial from "./pages/Editorial";
import SocialMedia from "./pages/SocialMedia";
import SocialPostEditor from "./pages/SocialPostEditor";
import SocialApproval from "./pages/SocialApproval";
import StudioTool from "./pages/studio/StudioTool";
import AIAgents from "./pages/AIAgents";
import AIAgentDetail from "./pages/AIAgentDetail";
import AIAgentConversation from "./pages/AIAgentConversation";

import { HeaderProvider } from "@/contexts/HeaderContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
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
          <HeaderProvider>
            <ScrollToTop />
            <AuthProvider>
              <PlanThemeProvider>
                <OrganizationProvider>
                  <InstallPromptBanner />
                  <ReloadPrompt />
                  <ErrorBoundary>
                    <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/demo/*" element={<Demo />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/parcerias" element={<PartnerProgram />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/set-password" element={<SetPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/select-plan" element={<SelectPlan />} />
                    <Route path="/accept-invite" element={<AcceptInvite />} />
                    <Route path="/approve/:token" element={<SocialApproval />} />
                    {/* Public Link23 page (handle includes the leading @) */}
                    <Route path="/:orgSlug/:handle" element={<LinkTreePublic />} />
                    <Route path="/app/onboarding" element={<Onboarding />} />
                    <Route path="/app/select-organization" element={<SelectOrganization />} />
                    <Route
                      path="/app"
                      element={
                        <ProtectedRoute>
                          <AppLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Dashboard />} />
                      <Route path="pipeline" element={<Pipeline />} />
                      <Route path="sales-funnel" element={<Navigate to="/app/pipeline?tab=sales" replace />} />
                      <Route path="operational-flow" element={<Navigate to="/app/pipeline?tab=operations" replace />} />
                      <Route path="clients" element={
                        <RoleProtectedRoute requireClients>
                          <Clients />
                        </RoleProtectedRoute>
                      } />
                      <Route path="clients/:clientId" element={<ClientDetail />} />
                      <Route path="clients/edit/:clientId" element={
                        <RoleProtectedRoute allowedRoles={['admin', 'sales', 'owner']}>
                          <EditClient />
                        </RoleProtectedRoute>
                      } />
                      <Route path="new-client" element={
                        <RoleProtectedRoute allowedRoles={['admin', 'sales', 'owner']}>
                          <NewClient />
                        </RoleProtectedRoute>
                      } />
                      <Route path="academia" element={<Academia />} />
                      <Route path="team" element={
                        <RoleProtectedRoute requireTeam>
                          <Team />
                        </RoleProtectedRoute>
                      } />
                      <Route path="ai-assistant" element={<AgenteQIA />} />
                      <Route path="ai-agents" element={<AIAgents />} />
                      <Route path="ai-agents/:agentId" element={<AIAgentDetail />} />
                      <Route path="ai-agents/:agentId/conversations/:conversationId" element={<AIAgentConversation />} />
                      <Route path="link-trees" element={
                        <RoleProtectedRoute privilege="link23">
                          <LinkTreeDashboard />
                        </RoleProtectedRoute>
                      } />
                      <Route path="clients/:clientId/links" element={
                        <RoleProtectedRoute privilege="link23">
                          <LinkTreeEditor />
                        </RoleProtectedRoute>
                      } />
                      <Route path="studio" element={
                        <RoleProtectedRoute privilege="studio">
                          <StudioDashboard />
                        </RoleProtectedRoute>
                      } />
                      <Route path="studio" element={
                        <RoleProtectedRoute privilege="studio">
                          <StudioDashboard />
                        </RoleProtectedRoute>
                      } />
                      <Route path="studio/tools/:toolId" element={
                        <RoleProtectedRoute privilege="studio">
                          <StudioTool />
                        </RoleProtectedRoute>
                      } />
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
                      <Route path="finance" element={
                        <RoleProtectedRoute privilege="finance">
                          <FinanceReports />
                        </RoleProtectedRoute>
                      } />
                      <Route path="finance/transactions" element={
                        <RoleProtectedRoute privilege="finance">
                          <FinanceTransactions />
                        </RoleProtectedRoute>
                      } />
                      <Route path="finance/projects" element={
                        <RoleProtectedRoute privilege="finance">
                          <FinanceProjects />
                        </RoleProtectedRoute>
                      } />
                      <Route path="finance/goals" element={
                        <RoleProtectedRoute privilege="finance">
                          <FinanceGoals />
                        </RoleProtectedRoute>
                      } />
                      <Route path="finance/reports" element={
                        <RoleProtectedRoute privilege="finance">
                          <FinanceReports />
                        </RoleProtectedRoute>
                      } />
                      <Route path="editorial" element={
                        <RoleProtectedRoute privilege="editorial">
                          <Editorial />
                        </RoleProtectedRoute>
                      } />
                      <Route path="social-media" element={
                        <RoleProtectedRoute privilege="social_media">
                          <SocialMedia />
                        </RoleProtectedRoute>
                      } />
                      <Route path="social-media/new" element={
                        <RoleProtectedRoute privilege="social_media">
                          <ErrorBoundary>
                            <SocialPostEditor />
                          </ErrorBoundary>
                        </RoleProtectedRoute>
                      } />
                      <Route path="social-media/edit/:postId" element={
                        <RoleProtectedRoute privilege="social_media">
                          <ErrorBoundary>
                            <SocialPostEditor />
                          </ErrorBoundary>
                        </RoleProtectedRoute>
                      } />
                    </Route>
                    {/* Admin Routes - wrapped in ProtectedRoute for auth gate */}
                    <Route path="/admin" element={
                      <ProtectedRoute>
                        <AdminLayout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<AdminDashboard />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="subscriptions" element={<AdminSubscriptions />} />
                      <Route path="feedbacks" element={<AdminFeedbacks />} />
                      <Route path="support" element={<AdminSupport />} />
                    </Route>
                    <Route path="/not-found" element={<NotFound />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
              </OrganizationProvider>
            </PlanThemeProvider>
          </AuthProvider>
          </HeaderProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
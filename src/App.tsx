import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import SalesFunnel from "./pages/SalesFunnel";
import OperationalFlow from "./pages/OperationalFlow";
import Clients from "./pages/Clients";
import NewClient from "./pages/NewClient";
import Checklists from "./pages/Checklists";
import Team from "./pages/Team";
import AIAssistant from "./pages/AIAssistant";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="sales-funnel" element={<SalesFunnel />} />
            <Route path="operational-flow" element={<OperationalFlow />} />
            <Route path="clients" element={<Clients />} />
            <Route path="new-client" element={<NewClient />} />
            <Route path="checklists" element={<Checklists />} />
            <Route path="team" element={<Team />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

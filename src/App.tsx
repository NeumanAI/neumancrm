import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { BrandingProvider } from "@/contexts/BrandingContext";

// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Pipeline from "./pages/Pipeline";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import DataManagement from "./pages/DataManagement";
import ContactDetail from "./pages/ContactDetail";
import Team from "./pages/Team";
import Conversations from "./pages/Conversations";
import PendingApproval from "./pages/PendingApproval";
import Admin from "./pages/Admin";
import ResellerAdmin from "./pages/ResellerAdmin";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import FirmaDigital from "./pages/FirmaDigital";
import AgenticRAG from "./pages/AgenticRAG";
import Labs from "./pages/Labs";
import CRMDocumentation from "./pages/CRMDocumentation";
import CalendarPage from "./pages/CalendarPage";
import GoogleCalendarCallback from "./pages/GoogleCalendarCallback";
import Documents from "./pages/Documents";
import SharedDocument from "./pages/SharedDocument";

import BrandedAuth from "./pages/BrandedAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrandingProvider>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Auth route - no layout */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/:slug" element={<BrandedAuth />} />
            
            {/* Pending approval - no layout */}
            <Route path="/pending-approval" element={<PendingApproval />} />
            
            {/* Admin panel - no layout (has its own) */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/firma-digital" element={<FirmaDigital />} />
            <Route path="/admin/agentic-rag" element={<AgenticRAG />} />
            <Route path="/admin/labs" element={<Labs />} />
            <Route path="/crm-documentation" element={<CRMDocumentation />} />
            
            
            {/* Reseller admin panel - no layout (has its own) */}
            <Route path="/reseller-admin" element={<ResellerAdmin />} />
            
            {/* Protected routes with layout */}
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/contacts" element={<AppLayout><Contacts /></AppLayout>} />
            <Route path="/contacts/:contactId" element={<AppLayout><ContactDetail /></AppLayout>} />
            <Route path="/companies" element={<AppLayout><Companies /></AppLayout>} />
            <Route path="/companies/:companyId" element={<AppLayout><CompanyDetail /></AppLayout>} />
            <Route path="/pipeline" element={<AppLayout><Pipeline /></AppLayout>} />
            <Route path="/tasks" element={<AppLayout><Tasks /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            <Route path="/data-management" element={<AppLayout><DataManagement /></AppLayout>} />
            <Route path="/team" element={<AppLayout><Team /></AppLayout>} />
            <Route path="/conversations" element={<AppLayout><Conversations /></AppLayout>} />
            <Route path="/projects" element={<AppLayout><Projects /></AppLayout>} />
            <Route path="/projects/:projectId" element={<AppLayout><ProjectDetail /></AppLayout>} />
            <Route path="/calendar" element={<AppLayout><CalendarPage /></AppLayout>} />
            <Route path="/documents" element={<AppLayout><Documents /></AppLayout>} />
            <Route path="/shared/:token" element={<SharedDocument />} />
            <Route path="/auth/google-calendar-callback" element={<GoogleCalendarCallback />} />
            
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </BrandingProvider>
  </QueryClientProvider>
);

export default App;

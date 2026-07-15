import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import VerifyOtp from "./pages/VerifyOtp";
import { ProtectedRoute, GuestRoute } from "./components/ProtectedRoute";
import AppLayout from "./components/app/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Invoices from "./pages/Invoices";
import InvoiceEditorPage from "./pages/InvoiceEditorPage";
import InvoiceView from "./pages/InvoiceView";
import Estimates from "./pages/Estimates";
import EstimateEditorPage from "./pages/EstimateEditorPage";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import Projects from "./pages/Projects";
import ProjectEditorPage from "./pages/ProjectEditorPage";
import Tags from "./pages/Tags";
import Recurring from "./pages/Recurring";
import RecurringEditorPage from "./pages/RecurringEditorPage";
import Profitability from "./pages/Profitability";
import Deliverables from "./pages/Deliverables";
import ReceiptInbox from "./pages/ReceiptInbox";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/verify-otp"
            element={
              <GuestRoute>
                <VerifyOtp />
              </GuestRoute>
            }
          />

          {/* Authenticated app */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/new" element={<InvoiceEditorPage />} />
            <Route path="invoices/:id" element={<InvoiceView />} />
            <Route path="invoices/:id/edit" element={<InvoiceEditorPage />} />
            <Route path="estimates" element={<Estimates />} />
            <Route path="estimates/new" element={<EstimateEditorPage />} />
            <Route path="estimates/:id/edit" element={<EstimateEditorPage />} />
            <Route path="clients" element={<Clients />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/new" element={<ProjectEditorPage />} />
            <Route path="projects/:id/edit" element={<ProjectEditorPage />} />
            <Route path="tags" element={<Tags />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="deliverables" element={<Deliverables />} />
            <Route path="receipts" element={<ReceiptInbox />} />
            <Route path="profitability" element={<Profitability />} />
            <Route path="recurring" element={<Recurring />} />
            <Route path="recurring/new" element={<RecurringEditorPage />} />
            <Route path="recurring/:id/edit" element={<RecurringEditorPage />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

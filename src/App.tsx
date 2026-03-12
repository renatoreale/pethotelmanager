import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Preventivi from "./pages/Preventivi";
import Prenotazioni from "./pages/Prenotazioni";
import Appuntamenti from "./pages/Appuntamenti";
import CheckIn from "./pages/CheckIn";
import CheckOut from "./pages/CheckOut";
import Pagamenti from "./pages/Pagamenti";
import Clienti from "./pages/Clienti";
import Gatti from "./pages/Gatti";
import Planning from "./pages/Planning";
import Utenti from "./pages/Utenti";
import TemplateEmail from "./pages/TemplateEmail";
import Pensione from "./pages/Pensione";
import NotFound from "./pages/NotFound";
import RegistroGatti from "./pages/RegistroGatti";
import Presenze from "./pages/Presenze";
import OccupazioneCasette from "./pages/OccupazioneCasette";
import Admin from "./pages/Admin";
import Landing from "./pages/Landing";
import RegisterTrial from "./pages/RegisterTrial";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/landing" element={<Landing />} />
            <Route path="/register-trial" element={<RegisterTrial />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/preventivi" element={<Preventivi />} />
              <Route path="/prenotazioni" element={<Prenotazioni />} />
              <Route path="/appuntamenti" element={<Appuntamenti />} />
              <Route path="/check-in" element={<CheckIn />} />
              <Route path="/check-out" element={<CheckOut />} />
              <Route path="/pagamenti" element={<Pagamenti />} />
              <Route path="/clienti" element={<Clienti />} />
              <Route path="/gatti" element={<Gatti />} />
              <Route path="/registro-gatti" element={<RegistroGatti />} />
              <Route path="/presenze" element={<Presenze />} />
              <Route path="/planning" element={<Planning />} />
              <Route path="/utenti" element={<Utenti />} />
              <Route path="/template-email" element={<TemplateEmail />} />
              <Route path="/pensione" element={<Pensione />} />
              <Route path="/occupazione" element={<OccupazioneCasette />} />
              <Route path="/admin" element={<Admin />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

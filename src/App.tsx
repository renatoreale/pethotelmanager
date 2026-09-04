import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SupabaseClientProvider } from "@/hooks/useSupabaseClient";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ClienteProtectedRoute } from "@/components/cliente/ClienteProtectedRoute";
import { ClienteLayout } from "@/components/cliente/ClienteLayout";
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
import SchedaPet from "./pages/SchedaPet";

import Utenti from "./pages/Utenti";
import TemplateEmail from "./pages/TemplateEmail";
import Pensione from "./pages/Pensione";
import NotFound from "./pages/NotFound";
import RegistroGatti from "./pages/RegistroGatti";
import Presenze from "./pages/Presenze";
import OccupazioneCasette from "./pages/OccupazioneCasette";
import Admin from "./pages/Admin";
import Landing from "./pages/Landing";
import LandingEn from "./pages/LandingEn";
import Privacy from "./pages/Privacy";
import Termini from "./pages/Termini";
import RegisterTrial from "./pages/RegisterTrial";
import ConfirmDemo from "./pages/ConfirmDemo";
import Statistiche from "./pages/Statistiche";
import Supporto from "./pages/Supporto";
import PurchaseSuccess from "./pages/PurchaseSuccess";
import Blog from "./pages/Blog";
import OverbookingPensione from "./pages/blog/OverbookingPensione";
import CostiPensione from "./pages/blog/CostiPensione";
import AprirePensione from "./pages/blog/AprirePensione";

// Client portal
import ClienteLogin from "./pages/cliente/ClienteLogin";
import ClienteSetPassword from "./pages/cliente/ClienteSetPassword";
import ClienteDashboard from "./pages/cliente/ClienteDashboard";
import ClienteProfilo from "./pages/cliente/ClienteProfilo";
import ClienteAnimali from "./pages/cliente/ClienteAnimali";
import ClientePreventivi from "./pages/cliente/ClientePreventivi";
import ClienteRichiestaPreventivo from "./pages/cliente/ClienteRichiestaPreventivo";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Fix per un bug noto di Radix UI: quando un Dialog contiene un Select annidato,
    // alla chiusura a volte "pointer-events: none" resta bloccato sul body anche se
    // nessun overlay è più aperto, rendendo l'intera pagina non cliccabile.
    const observer = new MutationObserver(() => {
      if (
        document.body.style.pointerEvents === "none" &&
        !document.querySelector('[data-state="open"]')
      ) {
        document.body.style.pointerEvents = "";
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SupabaseClientProvider>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/en" element={<LandingEn />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/termini" element={<Termini />} />
            <Route path="/register-trial" element={<RegisterTrial />} />
            <Route path="/confirm-demo" element={<ConfirmDemo />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/acquisto-completato" element={<PurchaseSuccess />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/overbooking-pensione-animali" element={<OverbookingPensione />} />
            <Route path="/blog/quanto-costa-gestire-pensione-animali" element={<CostiPensione />} />
            <Route path="/blog/aprire-pensione-cani-gatti" element={<AprirePensione />} />

            {/* Client portal - public */}
            <Route path="/cliente/login" element={<ClienteLogin />} />
            <Route path="/cliente/set-password" element={<ClienteSetPassword />} />

            {/* Client portal - protected */}
            <Route element={<ClienteProtectedRoute />}>
              <Route element={<ClienteLayout />}>
                <Route path="/cliente" element={<ClienteDashboard />} />
                <Route path="/cliente/profilo" element={<ClienteProfilo />} />
                <Route path="/cliente/animali" element={<ClienteAnimali />} />
                <Route path="/cliente/preventivi" element={<ClientePreventivi />} />
                <Route path="/cliente/richiedi-preventivo" element={<ClienteRichiestaPreventivo />} />
              </Route>
            </Route>

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Index />} />
              <Route path="/preventivi" element={<Preventivi />} />
              <Route path="/prenotazioni" element={<Prenotazioni />} />
              <Route path="/appuntamenti" element={<Appuntamenti />} />
              <Route path="/check-in" element={<CheckIn />} />
              <Route path="/check-out" element={<CheckOut />} />
              <Route path="/pagamenti" element={<Pagamenti />} />
              <Route path="/clienti" element={<Clienti />} />
              <Route path="/gatti" element={<Gatti />} />
              <Route path="/gatti/:id" element={<SchedaPet />} />
              <Route path="/registro-gatti" element={<RegistroGatti />} />
              <Route path="/presenze" element={<Presenze />} />
              
              <Route path="/utenti" element={<Utenti />} />
              <Route path="/template-email" element={<TemplateEmail />} />
              <Route path="/pensione" element={<Pensione />} />
              <Route path="/occupazione" element={<OccupazioneCasette />} />
              <Route path="/statistiche" element={<Statistiche />} />
              <Route path="/supporto" element={<Supporto />} />
              <Route path="/admin" element={<Admin />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
        </SupabaseClientProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;

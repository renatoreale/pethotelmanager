import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/preventivi" element={<Preventivi />} />
            <Route path="/prenotazioni" element={<Prenotazioni />} />
            <Route path="/appuntamenti" element={<Appuntamenti />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/check-out" element={<CheckOut />} />
            <Route path="/pagamenti" element={<Pagamenti />} />
            <Route path="/clienti" element={<Clienti />} />
            <Route path="/gatti" element={<Gatti />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/utenti" element={<Utenti />} />
            <Route path="/template-email" element={<TemplateEmail />} />
            <Route path="/pensione" element={<Pensione />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, Resource } from "@/hooks/usePermissions";

// Map routes to resources
const ROUTE_RESOURCE_MAP: Record<string, Resource> = {
  "/": "dashboard",
  "/preventivi": "preventivi",
  "/prenotazioni": "prenotazioni",
  "/appuntamenti": "appuntamenti",
  "/check-in": "check-in",
  "/check-out": "check-out",
  "/pagamenti": "pagamenti",
  "/clienti": "clienti",
  "/gatti": "gatti",
  "/registro-gatti": "registro-gatti",
  "/occupazione": "occupazione",
  "/statistiche": "statistiche",
  "/utenti": "utenti",
  "/template-email": "template-email",
  "/pensione": "pensione",
  "/admin": "admin",
};

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profileLoading, roles, trialExpired } = useAuth();
  const { canRead, primaryRole } = usePermissions();
  const location = useLocation();

  // Wait for auth AND profile/roles to fully load
  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Trial expired — block access
  if (trialExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <div className="text-5xl">⏰</div>
          <h1 className="text-xl font-bold text-foreground">Periodo di prova scaduto</h1>
          <p className="text-muted-foreground">
            Il tuo periodo di prova gratuita è terminato. Per continuare ad utilizzare Pet Hotel Manager, attiva un abbonamento.
          </p>
          <div className="flex flex-col gap-2">
            <a href="mailto:marketing@pethotelmanager.com" className="text-primary hover:underline text-sm">
              Contatta il supporto per attivare un piano
            </a>
            <button
              onClick={async () => {
                const { supabase } = await import("@/integrations/supabase/client");
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              className="text-muted-foreground hover:underline text-sm"
            >
              Esci
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If roles are loaded but empty, user has no role assigned — don't redirect loop
  if (roles.length === 0 || !primaryRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <div className="text-5xl">🔒</div>
          <h1 className="text-xl font-bold text-foreground">Accesso non configurato</h1>
          <p className="text-muted-foreground">
            Il tuo account non ha ancora un ruolo assegnato. Contatta l'amministratore per ricevere i permessi di accesso.
          </p>
          <button
            onClick={async () => {
              const { supabase } = await import("@/integrations/supabase/client");
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="text-primary hover:underline text-sm"
          >
            Torna al login
          </button>
        </div>
      </div>
    );
  }

  // Check page-level permissions — avoid redirecting to the same page
  const resource = ROUTE_RESOURCE_MAP[location.pathname];
  if (resource && !canRead(resource)) {
    if (location.pathname === "/") {
      // Already on dashboard but no read permission — show message instead of loop
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="text-center max-w-md space-y-4">
            <div className="text-5xl">🚫</div>
            <h1 className="text-xl font-bold text-foreground">Accesso limitato</h1>
            <p className="text-muted-foreground">
              Non hai i permessi per accedere a questa pagina.
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

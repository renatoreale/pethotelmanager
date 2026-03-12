import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useClienteProfile } from "@/hooks/useClienteAuth";

export function ClienteProtectedRoute() {
  const { user, loading: authLoading } = useAuth();
  const { data: clientProfile, isLoading: profileLoading } = useClienteProfile();

  if (authLoading || profileLoading) {
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
    return <Navigate to="/cliente/login" replace />;
  }

  if (!clientProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <div className="text-5xl">🚫</div>
          <h1 className="text-xl font-bold text-foreground">Accesso non autorizzato</h1>
          <p className="text-muted-foreground">
            Il tuo account non è associato a nessun profilo cliente.
            Contatta la tua pensione per ricevere un invito.
          </p>
          <button
            onClick={() => {
              import("@/integrations/supabase/client").then(({ supabase }) => {
                supabase.auth.signOut();
              });
            }}
            className="text-primary hover:underline text-sm"
          >
            Torna al login
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

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
  const { user, loading, profileLoading } = useAuth();
  const { canRead } = usePermissions();
  const location = useLocation();

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

  // Check page-level permissions
  const resource = ROUTE_RESOURCE_MAP[location.pathname];
  if (resource && !canRead(resource)) {
    // Redirect to dashboard if user doesn't have permission
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

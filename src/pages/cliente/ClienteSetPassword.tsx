import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import petHotelLogo from "@/assets/pethotelmanager_logo.png";
import { XCircle, Loader2 } from "lucide-react";

export default function ClienteSetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"checking" | "ready" | "already_activated" | "expired">("checking");

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        // Recovery token worked — check if already activated
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: client } = await supabase
            .from("clients")
            .select("portal_activated")
            .eq("user_id", user.id)
            .single();

          if (client?.portal_activated) {
            setStatus("already_activated");
            return;
          }
        }
        setStatus("ready");
      }
    });

    // If no PASSWORD_RECOVERY event fires within 3s, check if user is already signed in
    timeout = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // User is signed in (from a previous click) — check portal_activated
        const { data: client } = await supabase
          .from("clients")
          .select("portal_activated")
          .eq("user_id", user.id)
          .single();

        if (client?.portal_activated) {
          setStatus("already_activated");
        } else if (client) {
          // Not yet activated — allow setting password
          setStatus("ready");
        } else {
          setStatus("expired");
        }
      } else {
        setStatus("expired");
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Le password non corrispondono");
      return;
    }
    if (password.length < 6) {
      toast.error("La password deve essere di almeno 6 caratteri");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
    } else {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Mark portal as activated in Supabase
          await supabase
            .from("clients")
            .update({ portal_activated: true })
            .eq("user_id", user.id);

          const { data: client } = await supabase
            .from("clients")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (client) {
            // Activate invite + delete password reset record in MySQL
            try {
              await Promise.all([
                supabase.functions.invoke("mysql-demo-leads", {
                  body: { action: "activate_invite", client_id: client.id },
                }),
                supabase.functions.invoke("mysql-demo-leads", {
                  body: { action: "delete_password_reset", client_id: client.id },
                }),
              ]);
            } catch (e) {
              console.error("MySQL post-activation failed:", e);
            }
          }
        }
      } catch (e) {
        console.error("Failed to mark portal as activated:", e);
      }
      toast.success("Password impostata con successo!");
      navigate("/cliente", { replace: true });
    }
    setLoading(false);
  };

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted px-4">
        <Card className="w-full max-w-md border-none shadow-xl">
          <CardHeader className="text-center">
            <img src={petHotelLogo} alt="Pet Hotel Manager" className="mx-auto mb-4 h-14 w-14 rounded-xl object-contain" />
            <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin mb-2" />
            <CardTitle className="text-xl">Verifica in corso...</CardTitle>
            <CardDescription>
              Stiamo verificando il tuo link di invito.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "already_activated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted px-4">
        <Card className="w-full max-w-md border-none shadow-xl">
          <CardHeader className="text-center">
            <img src={petHotelLogo} alt="Pet Hotel Manager" className="mx-auto mb-4 h-14 w-14 rounded-xl object-contain" />
            <CardTitle className="text-xl font-serif">Account già attivo</CardTitle>
            <CardDescription>
              Hai già impostato la password. Usa le tue credenziali per accedere all'area riservata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => navigate("/cliente/login")}>
              Accedi al Portale
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted px-4">
        <Card className="w-full max-w-md border-none shadow-xl">
          <CardHeader className="text-center">
            <img src={petHotelLogo} alt="Pet Hotel Manager" className="mx-auto mb-4 h-14 w-14 rounded-xl object-contain" />
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl font-serif">Link scaduto</CardTitle>
            <CardDescription>
              Questo link non è più valido. Contatta la tua pensione per richiedere un nuovo invito.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="text-center">
          <img src={petHotelLogo} alt="Pet Hotel Manager" className="mx-auto mb-4 h-14 w-14 rounded-xl object-contain" />
          <CardTitle className="text-2xl font-serif">Imposta Password</CardTitle>
          <CardDescription>Scegli una password per accedere alla tua area riservata</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nuova password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Conferma password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvataggio..." : "Imposta Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

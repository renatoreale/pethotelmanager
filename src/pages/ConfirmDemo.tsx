import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import petHotelLogo from "@/assets/pethotelmanager_logo.png";

const DEMO_EMAIL = "demo@pethotelmanager.com";
const DEMO_PASSWORD = "DemoTest2026!";

export default function ConfirmDemo() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already">("loading");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      return;
    }

    const confirmLead = async () => {
      // Confirm the lead via token
      const { data, error } = await (supabase
        .from("demo_leads") as any)
        .update({ confirmed: true, confirmed_at: new Date().toISOString() })
        .eq("token", token)
        .eq("confirmed", false)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Confirm error:", error);
        setStatus("error");
        return;
      }

      if (!data) {
        const { data: existing } = await (supabase
          .from("demo_leads") as any)
          .select("confirmed")
          .eq("token", token)
          .maybeSingle();

        if (existing?.confirmed) {
          setStatus("already");
        } else {
          setStatus("error");
        }
        return;
      }

      setStatus("success");

      // Auto-login with demo credentials
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

      if (loginError) {
        toast.info("Usa le credenziali demo per accedere.");
        setTimeout(() => navigate("/login?demo=true"), 2000);
      } else {
        toast.success("Accesso alla demo in corso...");
        setTimeout(() => navigate("/"), 1500);
      }
    };

    confirmLead();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-none shadow-lg">
        <CardHeader className="text-center">
          <img src={petHotelLogo} alt="Pet Hotel Manager" className="mx-auto mb-4 h-20 w-20 rounded-xl object-contain" />

          {status === "loading" && (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <CardTitle className="text-xl font-serif">Attivazione in corso...</CardTitle>
              <CardDescription>Stiamo attivando il tuo accesso alla demo.</CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl font-serif">Demo attivata!</CardTitle>
              <CardDescription>
                Accesso automatico in corso... Verrai reindirizzato alla dashboard demo.
              </CardDescription>
            </>
          )}

          {status === "already" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <CheckCircle2 className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-serif">Già attivato</CardTitle>
              <CardDescription>
                Il tuo accesso demo è già stato attivato. Puoi accedere direttamente.
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl font-serif">Link non valido</CardTitle>
              <CardDescription>
                Il link di attivazione non è valido o è scaduto. Contattaci per assistenza.
              </CardDescription>
            </>
          )}
        </CardHeader>
        {(status === "already" || status === "error") && (
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => navigate("/login?demo=true")}>
              Accedi con le credenziali demo
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/register-trial")}>
              Richiedi una nuova demo
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

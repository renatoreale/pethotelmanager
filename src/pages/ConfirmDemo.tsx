import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import petHotelLogo from "@/assets/pethotelmanager_logo.png";

export default function ConfirmDemo() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "confirmed" | "already" | "not_found" | "error">("loading");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("not_found");
      return;
    }

    const activate = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("activate-trial-lead", {
          body: { token },
        });

        if (error) {
          console.error("Activation error:", error);
          setStatus("error");
          return;
        }

        if (data?.status === "not_found") {
          setStatus("not_found");
        } else if (data?.status === "already_confirmed") {
          setStatus("already");
        } else if (data?.status === "confirmed") {
          setEmail(data.email || "");
          setStatus("confirmed");
        } else {
          setStatus("error");
        }
      } catch (err) {
        console.error("Activation error:", err);
        setStatus("error");
      }
    };

    activate();
  }, [searchParams]);

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
              <CardDescription>Stiamo attivando il tuo account.</CardDescription>
            </>
          )}

          {status === "confirmed" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl font-serif">Controlla la tua email!</CardTitle>
              <CardDescription>
                Abbiamo inviato un link a <strong>{email}</strong> per impostare la tua password e accedere alla prova gratuita.
              </CardDescription>
            </>
          )}

          {status === "already" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <CheckCircle2 className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-serif">Account già attivato</CardTitle>
              <CardDescription>
                Il tuo account è già stato attivato. Accedi con le tue credenziali.
              </CardDescription>
            </>
          )}

          {(status === "not_found" || status === "error") && (
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

        <CardContent className="space-y-3">
          {status === "already" && (
            <Button className="w-full" onClick={() => navigate("/login")}>
              Vai al login
            </Button>
          )}
          {(status === "not_found" || status === "error") && (
            <>
              <Button className="w-full" onClick={() => navigate("/register-trial")}>
                Richiedi una nuova prova
              </Button>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = "mailto:info@pethotelmanager.com"}>
                Contattaci
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

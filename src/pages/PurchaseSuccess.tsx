import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, AlertTriangle, Loader2 } from "lucide-react";

type State = "loading" | "success" | "already_done" | "error";

export default function PurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setErrorMsg("Parametro session_id mancante.");
      return;
    }

    supabase.functions
      .invoke("verify-purchase", { body: { session_id: sessionId } })
      .then(({ data, error }) => {
        if (error) {
          setState("error");
          setErrorMsg(error.message || "Errore durante la verifica.");
          return;
        }
        if (data?.success) {
          setState("success");
        } else {
          setState("error");
          setErrorMsg("Il pagamento non risulta completato. Se hai appena pagato, attendi qualche secondo e ricarica la pagina.");
        }
      });
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full border-2">
        {state === "loading" && (
          <>
            <CardHeader className="text-center">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
              <CardTitle>Verifica pagamento in corso...</CardTitle>
              <CardDescription>Attendi qualche secondo.</CardDescription>
            </CardHeader>
          </>
        )}

        {state === "success" && (
          <>
            <CardHeader className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Check className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-xl">Acquisto completato!</CardTitle>
              <CardDescription>
                Il pagamento è andato a buon fine. Riceverai a breve una email di conferma.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Il nostro team ti contatterà nelle prossime ore per attivare il tuo account
                e guidarti nella configurazione iniziale.
              </p>
              <Link to="/landing">
                <Button className="w-full">Torna alla Home</Button>
              </Link>
            </CardContent>
          </>
        )}

        {state === "error" && (
          <>
            <CardHeader className="text-center">
              <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="text-xl">Verifica non riuscita</CardTitle>
              <CardDescription>{errorMsg}</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Se il pagamento è avvenuto correttamente, contattaci e ti aiutiamo subito.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.location.reload()}
                >
                  Riprova
                </Button>
                <Link to="/landing" className="flex-1">
                  <Button variant="outline" className="w-full">Home</Button>
                </Link>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import petHotelLogo from "@/assets/pethotelmanager_logo.png";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Clock, CheckCircle2, Mail } from "lucide-react";

export default function RegisterTrial() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trialDays, setTrialDays] = useState(3);

  useEffect(() => {
    supabase.from("landing_config").select("trial_days").limit(1).single().then(({ data }) => {
      if (data?.trial_days) setTrialDays(data.trial_days);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyAccepted) {
      toast.error("Devi accettare l'informativa sulla privacy per continuare.");
      return;
    }
    setLoading(true);

    try {
      // Save lead
      const { data: lead, error: insertError } = await supabase
        .from("demo_leads")
        .insert({
          full_name: firstName,
          last_name: lastName,
          phone,
          email,
          privacy_accepted: privacyAccepted,
        })
        .select("token")
        .single();

      if (insertError) throw insertError;

      // Send validation email via edge function
      const { error: fnError } = await supabase.functions.invoke("send-demo-validation", {
        body: { email, firstName, lastName, token: lead.token },
      });

      if (fnError) {
        console.error("Email send error:", fnError);
        toast.error("Errore nell'invio dell'email di conferma. Riprova.");
        return;
      }

      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message || "Errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-none shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-serif">Controlla la tua email!</CardTitle>
            <CardDescription className="text-base">
              Abbiamo inviato un'email di conferma a <strong>{email}</strong>.
              Clicca sul link nell'email per attivare l'accesso alla demo gratuita.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p>Se non trovi l'email, controlla la cartella spam o posta indesiderata.</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/landing">
                <ArrowLeft className="h-4 w-4 mr-2" /> Torna alla landing
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-none shadow-lg">
        <CardHeader className="text-center">
          <Link to="/landing" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 self-start">
            <ArrowLeft className="h-4 w-4" /> Torna alla landing
          </Link>
          <img src={petHotelLogo} alt="Pet Hotel Manager" className="mx-auto mb-4 h-20 w-20 rounded-xl object-contain" />
          <CardTitle className="text-2xl font-serif">Prova Gratuita</CardTitle>
          <CardDescription className="flex items-center justify-center gap-1">
            <Clock className="h-4 w-4" /> {trialDays} giorni gratuiti, nessuna carta richiesta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome *</Label>
                <Input id="firstName" type="text" placeholder="Mario" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Cognome *</Label>
                <Input id="lastName" type="text" placeholder="Rossi" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input id="phone" type="tel" placeholder="+39 333 1234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="nome@email.it" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="privacy"
                checked={privacyAccepted}
                onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
              />
              <Label htmlFor="privacy" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Acconsento al trattamento dei miei dati personali ai sensi del GDPR (Reg. UE 2016/679) per la gestione della richiesta demo. I dati saranno utilizzati esclusivamente per fornire l'accesso alla prova gratuita. *
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !privacyAccepted}>
              {loading ? "Invio in corso..." : "Richiedi la demo gratuita"}
            </Button>
            <div className="text-center text-sm">
              <Link to="/login" className="text-primary hover:underline">
                Hai già un account? Accedi
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

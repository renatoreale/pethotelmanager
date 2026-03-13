import { useState, useEffect } from "react";
import petHotelLogo from "@/assets/pethotelmanager_logo.png";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Clock, CheckCircle2, Loader2 } from "lucide-react";

const DISPOSABLE_DOMAINS = [
  "mailinator.com","guerrillamail.com","tempmail.com","throwaway.email",
  "yopmail.com","sharklasers.com","guerrillamailblock.com","grr.la",
  "dispostable.com","trashmail.com","fakeinbox.com","tempail.com",
  "maildrop.cc","10minutemail.com","temp-mail.org","getnada.com",
  "mohmal.com","emailondeck.com","mintemail.com","discard.email",
  "mailnesia.com","tempr.email","bupmail.com","tmail.ws",
  "test.com","example.com","test.it","prova.com","prova.it"
];

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Inserisci almeno 2 caratteri";
  if (!/^[a-zA-ZÀ-ÿ' -]+$/.test(trimmed)) return "Caratteri non validi";
  if (/(.)\1{3,}/.test(trimmed)) return "Nome non valido";
  return null;
}

function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Email non valida";
  const domain = trimmed.split("@")[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) return "Usa un indirizzo email reale, non temporaneo";
  if (/^(test|prova|fake|asdf|qwerty)/i.test(trimmed.split("@")[0])) return "Inserisci un'email reale";
  return null;
}

function validatePhone(phone: string): string | null {
  const digits = phone.replace(/[\s\-\+\(\)]/g, "");
  if (digits.length < 9 || digits.length > 13) return "Inserisci un numero di telefono valido";
  if (!/^(\+?39)?[0-9]{9,10}$/.test(digits) && !/^(\+?39)?3[0-9]{8,9}$/.test(digits))
    return "Formato telefono non valido";
  if (/^(.)\1+$/.test(digits.slice(-9))) return "Numero di telefono non valido";
  return null;
}

const DEMO_EMAIL = "demo@pethotelmanager.com";
const DEMO_PASSWORD = "DemoTest2026!";

export default function RegisterTrial() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
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
      // Save lead via edge function (no email sent)
      const { error: fnError } = await supabase.functions.invoke("send-demo-validation", {
        body: { email, firstName, lastName, phone },
      });

      if (fnError) {
        console.error("Edge function error:", fnError);
        toast.error("Errore nel salvataggio. Riprova.");
        setLoading(false);
        return;
      }

      // Auto-login with demo credentials
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

      if (loginError) {
        toast.info("Accedi con le credenziali demo: " + DEMO_EMAIL);
        navigate("/login?demo=true");
      } else {
        toast.success("Benvenuto nella demo! Accesso in corso...");
        setTimeout(() => navigate("/"), 1000);
      }
    } catch (e: any) {
      toast.error(e.message || "Errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  };

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
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Accesso in corso...</>
              ) : (
                "Accedi alla demo gratuita"
              )}
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

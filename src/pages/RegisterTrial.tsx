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
import { ArrowLeft, Clock, CheckCircle2, Loader2, Mail } from "lucide-react";

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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    const fnErr = validateName(firstName);
    if (fnErr) newErrors.firstName = fnErr;
    const lnErr = validateName(lastName);
    if (lnErr) newErrors.lastName = lnErr;
    const emErr = validateEmail(email);
    if (emErr) newErrors.email = emErr;
    const phErr = validatePhone(phone);
    if (phErr) newErrors.phone = phErr;
    
    if (!privacyAccepted) {
      toast.error("Devi accettare l'informativa sulla privacy per continuare.");
      return;
    }
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Correggi i campi evidenziati");
      return;
    }
    
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("register-trial", {
        body: { email, firstName, lastName, phone },
      });

      if (fnError) {
        console.error("Edge function error:", fnError);
        toast.error("Errore durante la registrazione. Riprova.");
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
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
            <img src={petHotelLogo} alt="Pet Hotel Manager" className="mx-auto mb-4 h-20 w-20 rounded-xl object-contain" />
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl font-serif">Controlla la tua email!</CardTitle>
            <CardDescription className="text-base">
              Abbiamo inviato un'email a <strong>{email}</strong> con il link per impostare la tua password e accedere subito alla prova gratuita.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/landing">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" /> Torna alla home
              </Button>
            </Link>
            <div className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">
                Hai già un account? Accedi
              </Link>
            </div>
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
            <ArrowLeft className="h-4 w-4" /> Torna alla Home
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
                <Input id="firstName" type="text" placeholder="Mario" value={firstName} onChange={(e) => { setFirstName(e.target.value); setErrors(p => ({...p, firstName: ""})); }} required className={errors.firstName ? "border-destructive" : ""} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Cognome *</Label>
                <Input id="lastName" type="text" placeholder="Rossi" value={lastName} onChange={(e) => { setLastName(e.target.value); setErrors(p => ({...p, lastName: ""})); }} required className={errors.lastName ? "border-destructive" : ""} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono *</Label>
              <Input id="phone" type="tel" placeholder="+39 333 1234567" value={phone} onChange={(e) => { setPhone(e.target.value); setErrors(p => ({...p, phone: ""})); }} required className={errors.phone ? "border-destructive" : ""} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="nome@email.it" value={email} onChange={(e) => { setEmail(e.target.value); setErrors(p => ({...p, email: ""})); }} required className={errors.email ? "border-destructive" : ""} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <p className="text-sm text-muted-foreground text-center bg-muted/50 rounded-md p-2">
              ⚠️ Inserisci dati veritieri: le credenziali di accesso verranno inviate all'email indicata.
            </p>
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
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Invio in corso...</>
              ) : (
                "Richiedi accesso gratuito"
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

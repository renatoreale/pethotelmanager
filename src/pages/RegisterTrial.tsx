import { useState, useEffect } from "react";
import petHotelLogo from "@/assets/pethotelmanager_logo.png";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Clock } from "lucide-react";

export default function RegisterTrial() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [petType, setPetType] = useState<"gatti" | "cani" | "entrambi">("gatti");
  const [loading, setLoading] = useState(false);
  const [trialDays, setTrialDays] = useState(14);

  useEffect(() => {
    supabase.from("landing_config").select("trial_days").limit(1).single().then(({ data }) => {
      if (data?.trial_days) setTrialDays(data.trial_days);
    });
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Registrazione fallita");

      const isExistingUser =
        Array.isArray(authData.user.identities) && authData.user.identities.length === 0;

      if (isExistingUser) {
        toast.info(
          "Questa email risulta già registrata: accedi oppure usa 'Password dimenticata?' per ricevere l'email di reset.",
          { duration: 8000 }
        );
        navigate("/login");
        return;
      }

      toast.success(
        `Registrazione completata! Controlla la tua email per confermare l'account. Avrai ${trialDays} giorni di prova gratuita.`,
        { duration: 8000 }
      );
      navigate("/login");
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
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" type="text" placeholder="Mario Rossi" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nome@pensione.it" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Minimo 6 caratteri" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Tipo di animali gestiti</Label>
              <Select value={petType} onValueChange={(v: any) => setPetType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gatti">🐱 Solo gatti</SelectItem>
                  <SelectItem value="cani">🐶 Solo cani</SelectItem>
                  <SelectItem value="entrambi">🐾 Gatti e cani</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registrazione..." : "Inizia la prova gratuita"}
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

import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import petHotelLogo from "@/assets/pethotelmanager_logo.png";

const DEMO_EMAIL = "demo@pethotelmanager.com";
const DEMO_PASSWORD = "DemoTest2026!";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const [email, setEmail] = useState(isDemo ? DEMO_EMAIL : "");
  const [password, setPassword] = useState(isDemo ? DEMO_PASSWORD : "");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("auth.loginSuccess"));
      navigate("/");
    }
    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error(t("auth.resendEnterEmail"));
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("auth.resendSuccess"));
    }
    setResending(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-none shadow-lg">
        <CardHeader className="text-center">
          <Link to="/landing" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 self-start">
            <ArrowLeft className="h-4 w-4" /> Torna alla home
          </Link>
          <img src={petHotelLogo} alt="Pet Hotel Manager" className="mx-auto mb-4 h-20 w-20 rounded-xl object-contain" />
          <CardTitle className="text-2xl font-serif">{t("auth.appName")}</CardTitle>
          <CardDescription>{t("auth.loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.emailLabel")}</Label>
              <Input id="email" type="email" placeholder="name@hotel.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.loginLoading") : t("auth.loginButton")}
            </Button>
            <div className="flex justify-end text-sm">
              <Link to="/forgot-password" className="text-muted-foreground hover:underline">{t("auth.forgotPassword")}</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

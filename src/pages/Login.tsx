import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { MailCheck } from "lucide-react";

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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground font-serif text-2xl">
            🐾
          </div>
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
            <div className="flex justify-between text-sm">
              <Link to="/register" className="text-primary hover:underline">{t("auth.register")}</Link>
              <Link to="/forgot-password" className="text-muted-foreground hover:underline">{t("auth.forgotPassword")}</Link>
            </div>
          </form>
          <div className="mt-4 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 text-muted-foreground"
              onClick={handleResendConfirmation}
              disabled={resending}
            >
              <MailCheck className="h-4 w-4" />
              {resending ? t("auth.sending") : t("auth.resendConfirmation")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

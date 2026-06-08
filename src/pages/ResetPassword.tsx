import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase as baseClient } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // PKCE flow: code in query string. Implicit flow: access_token + type=recovery in hash.
    const hasPkceCode = window.location.search.includes("code=");
    const hasRecoveryHash = window.location.hash.includes("type=recovery") || window.location.hash.includes("type=invite");

    const { data: { subscription } } = baseClient.auth.onAuthStateChange((event, session) => {
      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        (session && (hasRecoveryHash || hasPkceCode))
      ) {
        setReady(true);
      }
    });

    // Also check if session already exists (e.g. PKCE exchange completed before this effect ran)
    baseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      } else if (!hasRecoveryHash && !hasPkceCode) {
        toast.error(t("auth.invalidLink"));
        navigate("/login");
      }
      // If hasPkceCode: wait for onAuthStateChange to fire after code exchange
    });

    return () => subscription.unsubscribe();
  }, [navigate, t]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Always use baseClient: recovery link session is on the base Supabase project
    const { error } = await baseClient.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Provision trial role for new users (baseClient has the session)
    try {
      const { data: provisionData, error: provisionError } = await baseClient.functions.invoke("provision-trial");
      if (provisionError) {
        console.error("[ResetPassword] provision-trial error:", provisionError);
      } else {
        console.log("[ResetPassword] provision-trial result:", provisionData);
      }
    } catch (e) {
      console.error("[ResetPassword] provision-trial exception:", e);
    }

    toast.success(t("auth.passwordUpdated"));
    navigate("/dashboard");
    setLoading(false);
  };

  if (!ready) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-none shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif">{t("auth.newPassword")}</CardTitle>
          <CardDescription>{t("auth.newPasswordSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.newPasswordLabel")}</Label>
              <Input id="password" type="password" placeholder={t("auth.minChars")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.updating") : t("auth.updatePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

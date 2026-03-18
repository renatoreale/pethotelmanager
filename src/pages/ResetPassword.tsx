import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabase } from "@/hooks/useSupabaseClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const supabase = useSupabase();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("type=invite")) {
      setReady(true);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setReady(true);
        } else {
          toast.error(t("auth.invalidLink"));
          navigate("/login");
        }
      });
    }
  }, [navigate, t]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    // Attempt trial provisioning for new trial users
    try {
      await supabase.functions.invoke("provision-trial");
    } catch (_) {
      // Non-trial users: ignore
    }
    toast.success(t("auth.passwordUpdated"));
    navigate("/");
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

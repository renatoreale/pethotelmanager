import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ClienteLogin() {
  const supabase = useSupabase();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Check if this user is a client
      supabase
        .from("clients")
        .select("id")
        .eq("user_id" as any, user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) navigate("/cliente", { replace: true });
        });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Email o password non validi");
    } else {
      // Check if user is a client
      const { data: { user: loggedUser } } = await supabase.auth.getUser();
      if (loggedUser) {
        const { data: client } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id" as any, loggedUser.id)
          .maybeSingle();
        
        if (client) {
          toast.success("Accesso effettuato");
          navigate("/cliente", { replace: true });
        } else {
          await supabase.auth.signOut();
          toast.error("Questo account non è associato a un profilo cliente");
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground text-2xl">
            🐾
          </div>
          <CardTitle className="text-2xl font-serif">Area Clienti</CardTitle>
          <CardDescription>Accedi per gestire le tue prenotazioni</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="la-tua@email.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Accesso in corso..." : "Accedi"}
            </Button>
            <div className="text-center">
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:underline">
                Password dimenticata?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

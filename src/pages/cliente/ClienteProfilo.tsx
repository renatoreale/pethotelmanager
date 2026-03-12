import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useClienteProfile, useUpdateClienteProfile } from "@/hooks/useClienteAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function ClienteProfilo() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useClienteProfile();
  const updateProfile = useUpdateClienteProfile();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    fiscal_code: "",
    address: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        fiscal_code: profile.fiscal_code || "",
        address: profile.address || "",
      });
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      await updateProfile.mutateAsync({
        id: profile.id,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
        fiscal_code: form.fiscal_code || null,
        address: form.address || null,
      } as any);
      toast.success("Profilo aggiornato");
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-serif font-bold">Il Mio Profilo</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dati Personali</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Cognome *</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} disabled className="opacity-60" />
              <p className="text-[10px] text-muted-foreground">
                L'email non può essere modificata. Contatta la pensione per cambiarla.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+39 ..."
                />
              </div>
              <div className="space-y-2">
                <Label>Codice Fiscale</Label>
                <Input
                  value={form.fiscal_code}
                  onChange={(e) => setForm({ ...form, fiscal_code: e.target.value.toUpperCase() })}
                  placeholder="RSSMRA85M01H501Z"
                  maxLength={16}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Indirizzo</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Via Roma 1, 00100 Roma"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateProfile.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateProfile.isPending ? "Salvataggio..." : "Salva Modifiche"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

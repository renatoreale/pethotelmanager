import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCreateClient, useUpdateClient, type Client } from "@/hooks/useClients";

const clientSchema = z.object({
  first_name: z.string().trim().min(1, "Nome obbligatorio").max(100),
  last_name: z.string().trim().min(1, "Cognome obbligatorio").max(100),
  email: z.string().trim().email("Email non valida").max(255).or(z.literal("")).optional(),
  phone: z.string().trim().max(50).optional(),
  fiscal_code: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  is_blacklisted: z.boolean().default(false),
  blacklist_reason: z.string().trim().max(500).optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

export function ClientDialog({ open, onOpenChange, client }: ClientDialogProps) {
  const { profile } = useAuth();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isEditing = !!client;

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      first_name: client?.first_name ?? "",
      last_name: client?.last_name ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      fiscal_code: client?.fiscal_code ?? "",
      address: client?.address ?? "",
      notes: client?.notes ?? "",
      is_blacklisted: client?.is_blacklisted ?? false,
      blacklist_reason: client?.blacklist_reason ?? "",
    },
  });

  const isBlacklisted = form.watch("is_blacklisted");

  const onSubmit = async (values: ClientFormValues) => {
    try {
      if (isEditing && client) {
        await updateClient.mutateAsync({
          id: client.id,
          ...values,
          email: values.email || null,
          phone: values.phone || null,
          fiscal_code: values.fiscal_code || null,
          address: values.address || null,
          notes: values.notes || null,
          blacklist_reason: values.is_blacklisted ? (values.blacklist_reason || null) : null,
        });
        toast.success("Cliente aggiornato");
      } else {
        await createClient.mutateAsync({
          ...values,
          tenant_id: profile?.tenant_id!,
          email: values.email || null,
          phone: values.phone || null,
          fiscal_code: values.fiscal_code || null,
          address: values.address || null,
          notes: values.notes || null,
          blacklist_reason: values.is_blacklisted ? (values.blacklist_reason || null) : null,
        });
        toast.success("Cliente creato");
      }
      onOpenChange(false);
      form.reset();
    } catch (err: any) {
      toast.error(err.message || "Errore nel salvataggio");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {isEditing ? "Modifica Cliente" : "Nuovo Cliente"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Mario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cognome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Rossi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="mario@email.it" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input placeholder="+39 333 1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="fiscal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codice Fiscale</FormLabel>
                  <FormControl>
                    <Input placeholder="RSSMRA80A01H501Z" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo</FormLabel>
                  <FormControl>
                    <Input placeholder="Via Roma 1, Milano" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Note sul cliente..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <FormField
                  control={form.control}
                  name="is_blacklisted"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <Label className="text-sm font-medium text-destructive">
                        Blacklist
                      </Label>
                    </FormItem>
                  )}
                />
              </div>
              {isBlacklisted && (
                <FormField
                  control={form.control}
                  name="blacklist_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo blacklist</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Motivo..." rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={createClient.isPending || updateClient.isPending}>
                {createClient.isPending || updateClient.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

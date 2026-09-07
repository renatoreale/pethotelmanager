import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Trash2, Check, X, Eye } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import {
  useDocumentsForBookings, useDocumentsForClient, useUploadDocument, useDeleteDocument, getDocumentSignedUrl,
} from "@/hooks/useDocuments";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_ICONS, REQUIRED_DOCUMENT_TYPES,
  PERSISTENT_DOCUMENT_TYPES, type DocumentType,
} from "@/lib/documentTypes";

interface DocumentiTabProps {
  catId: string;
  clientId: string | null;
  bookingId: string | null;
  bookingIds: string[];
  bookingNumberById: Map<string, string>;
}

export function DocumentiTab({ catId, clientId, bookingId, bookingIds, bookingNumberById }: DocumentiTabProps) {
  const { canWrite } = usePermissions();
  const canManage = canWrite("prenotazioni");
  const supabase = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: bookingDocuments, isLoading: loadingBookingDocs } = useDocumentsForBookings(bookingIds);
  // Libretto vaccinazioni e documento d'identità sono agganciati al cliente
  // (persistenti tra un soggiorno e l'altro), non alla singola prenotazione.
  const { data: clientDocuments, isLoading: loadingClientDocs } = useDocumentsForClient(clientId ?? undefined);
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();

  const [documentType, setDocumentType] = useState<DocumentType>("libretto_vaccinazioni");

  const documents = useMemo(
    () => [...(bookingDocuments ?? []), ...(clientDocuments ?? [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [bookingDocuments, clientDocuments]
  );

  const isRequirementSatisfied = (type: DocumentType) => {
    if (PERSISTENT_DOCUMENT_TYPES.includes(type)) {
      return (clientDocuments ?? []).some((d) => d.document_type === type);
    }
    return (bookingDocuments ?? []).some((d) => d.booking_id === bookingId && d.document_type === type);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Il file non può superare i 10MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      // I documenti "persistenti" (libretto vaccinazioni, documento
      // d'identità) si agganciano al cliente, non al soggiorno.
      const isPersistent = PERSISTENT_DOCUMENT_TYPES.includes(documentType);
      await uploadDocument.mutateAsync(
        isPersistent
          ? { clientId, documentType, file }
          : { bookingId, catId, documentType, file }
      );
      toast.success("Documento caricato");
    } catch (err: any) {
      toast.error(err.message || "Errore nel caricamento");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleView = async (storagePath: string) => {
    try {
      const url = await getDocumentSignedUrl(supabase, storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err.message || "Errore nell'apertura del documento");
    }
  };

  const handleDelete = async (id: string, storagePath: string) => {
    try {
      await deleteDocument.mutateAsync({ id, storagePath });
      toast.success("Documento eliminato");
    } catch (err: any) {
      toast.error(err.message || "Errore nell'eliminazione");
    }
  };

  return (
    <div className="space-y-4">
      {/* Requisiti del soggiorno */}
      <Card className="border shadow-sm">
        <CardHeader><CardTitle className="text-base">Requisiti del soggiorno attuale</CardTitle></CardHeader>
        <CardContent>
          {!bookingId ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessun soggiorno in corso: i requisiti si verificano al check-in.
            </p>
          ) : (
            <div className="space-y-2">
              {REQUIRED_DOCUMENT_TYPES.map((type) => {
                const has = isRequirementSatisfied(type);
                const Icon = DOCUMENT_TYPE_ICONS[type];
                return (
                  <div key={type} className="flex items-center gap-2.5 text-sm">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${has ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                      {has ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className={has ? "" : "text-muted-foreground"}>{DOCUMENT_TYPE_LABELS[type]}</span>
                    {!has && <Badge variant="outline" className="text-xs ml-1">Da raccogliere</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documenti */}
      <Card className="border shadow-sm">
        <CardHeader><CardTitle className="text-base">Documenti</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {canManage && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                <SelectTrigger className="w-[220px] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button" size="sm" variant="outline" className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadDocument.isPending}
              >
                <Upload className="h-3.5 w-3.5" /> {uploadDocument.isPending ? "Caricamento..." : "Carica documento"}
              </Button>
            </div>
          )}

          {(loadingBookingDocs || loadingClientDocs) ? (
            <p className="text-sm text-muted-foreground text-center py-6">Caricamento...</p>
          ) : !documents?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nessun documento caricato.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const Icon = DOCUMENT_TYPE_ICONS[doc.document_type] ?? DOCUMENT_TYPE_ICONS.altro;
                const bookingNumber = doc.booking_id ? bookingNumberById.get(doc.booking_id) : undefined;
                return (
                  <div key={doc.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.file_name}</p>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span>
                            {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                            {" · "}{format(new Date(doc.created_at), "dd MMM yyyy", { locale: it })}
                          </span>
                          {bookingNumber && <Badge variant="secondary" className="text-xs">{bookingNumber}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleView(doc.storage_path)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(doc.id, doc.storage_path)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Eye, Check, X } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import {
  useDocumentsForBookings, useDocumentsForClient, useUploadDocument, getDocumentSignedUrl,
} from "@/hooks/useDocuments";
import { useSupabase } from "@/hooks/useSupabaseClient";
import {
  CLIENT_UPLOAD_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_ICONS,
  PERSISTENT_DOCUMENT_TYPES, REQUIRED_DOCUMENT_TYPES, type DocumentType,
} from "@/lib/documentTypes";

interface ClientePreCheckinDocsProps {
  bookingId: string;
  clientId: string;
}

// Pre-check-in online: il cliente carica da solo i documenti richiesti per
// il soggiorno, prima dell'arrivo — libretto vaccinazioni e documento
// d'identità restano validi anche per i soggiorni futuri (agganciati al
// cliente), modulo di affido e certificato sanitario sono specifici di
// questo soggiorno.
export function ClientePreCheckinDocs({ bookingId, clientId }: ClientePreCheckinDocsProps) {
  const supabase = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: bookingDocuments, isLoading: loadingBookingDocs } = useDocumentsForBookings([bookingId]);
  const { data: clientDocuments, isLoading: loadingClientDocs } = useDocumentsForClient(clientId);
  const uploadDocument = useUploadDocument();

  const [documentType, setDocumentType] = useState<DocumentType>("libretto_vaccinazioni");

  const isSatisfied = (type: DocumentType) => {
    if (PERSISTENT_DOCUMENT_TYPES.includes(type)) {
      return (clientDocuments ?? []).some((d) => d.document_type === type);
    }
    return (bookingDocuments ?? []).some((d) => d.booking_id === bookingId && d.document_type === type);
  };

  const documents = useMemo(
    () => [...(bookingDocuments ?? []), ...(clientDocuments ?? [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [bookingDocuments, clientDocuments]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Il file non può superare i 10MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      const isPersistent = PERSISTENT_DOCUMENT_TYPES.includes(documentType);
      await uploadDocument.mutateAsync(
        isPersistent
          ? { clientId, documentType, file }
          : { bookingId, documentType, file }
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

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Documenti per il soggiorno</Label>

      <div className="space-y-1.5">
        {REQUIRED_DOCUMENT_TYPES.map((type) => {
          const has = isSatisfied(type);
          const Icon = DOCUMENT_TYPE_ICONS[type];
          return (
            <div key={type} className="flex items-center gap-2 text-sm">
              <span className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${has ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                {has ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
              </span>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={has ? "" : "text-muted-foreground"}>{DOCUMENT_TYPE_LABELS[type]}</span>
              {!has && <Badge variant="outline" className="text-xs ml-1">Da caricare</Badge>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
          <SelectTrigger className="w-[210px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CLIENT_UPLOAD_DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          type="button" size="sm" variant="outline" className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadDocument.isPending}
        >
          <Upload className="h-3.5 w-3.5" /> {uploadDocument.isPending ? "Caricamento..." : "Fotografa o carica"}
        </Button>
      </div>

      {(loadingBookingDocs || loadingClientDocs) ? (
        <p className="text-xs text-muted-foreground">Caricamento...</p>
      ) : documents.length > 0 && (
        <div className="space-y-1">
          {documents.map((doc) => {
            const Icon = DOCUMENT_TYPE_ICONS[doc.document_type] ?? DOCUMENT_TYPE_ICONS.altro;
            return (
              <div key={doc.id} className="flex items-center justify-between gap-2 text-xs py-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{DOCUMENT_TYPE_LABELS[doc.document_type]}</span>
                  <span className="text-muted-foreground shrink-0">
                    · {format(new Date(doc.created_at), "dd MMM yyyy", { locale: it })}
                  </span>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => handleView(doc.storage_path)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

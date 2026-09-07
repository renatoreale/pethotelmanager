import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Trash2, Eye, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import {
  useDocumentsForClient, useUploadDocument, useDeleteDocument, getDocumentSignedUrl,
} from "@/hooks/useDocuments";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useTenantConfig } from "@/hooks/usePensioneConfig";
import {
  CLIENT_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_ICONS, VERSIONED_DOCUMENT_TYPES,
  type DocumentType,
} from "@/lib/documentTypes";

interface ClientDocumentiSectionProps {
  clientId: string;
}

export function ClientDocumentiSection({ clientId }: ClientDocumentiSectionProps) {
  const supabase = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents, isLoading } = useDocumentsForClient(clientId);
  const { data: tenantConfig } = useTenantConfig();
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();

  const [documentType, setDocumentType] = useState<DocumentType>("privacy");
  const [documentVersion, setDocumentVersion] = useState("");

  const isVersioned = VERSIONED_DOCUMENT_TYPES.includes(documentType);

  const currentVersionFor = (type: DocumentType): string | null => {
    if (type === "regolamento") return (tenantConfig as any)?.regolamento_version ?? null;
    if (type === "privacy") return (tenantConfig as any)?.privacy_version ?? null;
    return null;
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
      await uploadDocument.mutateAsync({
        clientId, documentType, documentVersion: isVersioned ? (documentVersion.trim() || null) : null, file,
      });
      toast.success("Documento caricato");
      setDocumentVersion("");
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

  const clientDocuments = useMemo(
    () => (documents ?? []).filter((d) => CLIENT_DOCUMENT_TYPES.includes(d.document_type)),
    [documents]
  );

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Documenti (privacy, regolamento)</Label>

      <div className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={documentType} onValueChange={(v) => { setDocumentType(v as DocumentType); setDocumentVersion(""); }}>
            <SelectTrigger className="w-[200px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CLIENT_DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isVersioned && (
          <div className="space-y-1">
            <Label className="text-xs">Versione firmata</Label>
            <Input
              className="w-[180px] text-sm"
              placeholder="Es. v2 — gennaio 2026"
              value={documentVersion}
              onChange={(e) => setDocumentVersion(e.target.value)}
            />
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} />
        <Button
          type="button" size="sm" variant="outline" className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadDocument.isPending}
        >
          <Upload className="h-3.5 w-3.5" /> {uploadDocument.isPending ? "Caricamento..." : "Carica documento"}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Caricamento...</p>
      ) : clientDocuments.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nessun documento caricato per questo cliente.</p>
      ) : (
        <div className="space-y-1.5">
          {clientDocuments.map((doc) => {
            const Icon = DOCUMENT_TYPE_ICONS[doc.document_type] ?? DOCUMENT_TYPE_ICONS.altro;
            const current = currentVersionFor(doc.document_type);
            const isOutdated = current && doc.document_version && doc.document_version !== current;
            return (
              <div key={doc.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0 flex-wrap text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{doc.file_name}</p>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span>
                        {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                        {doc.document_version && ` · ${doc.document_version}`}
                        {" · "}{format(new Date(doc.created_at), "dd MMM yyyy", { locale: it })}
                      </span>
                      {current && doc.document_version && (
                        isOutdated ? (
                          <Badge variant="outline" className="text-xs gap-1 text-warning-foreground border-warning/30">
                            <AlertTriangle className="h-3 w-3" /> Versione precedente (attuale: {current})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1 text-success border-success/30">
                            <CheckCircle2 className="h-3 w-3" /> Aggiornato
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleView(doc.storage_path)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(doc.id, doc.storage_path)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

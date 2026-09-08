import { useAuth } from "@/hooks/useAuth";
import { useSupabase } from "@/hooks/useSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface PromoPhotoCandidate {
  url: string;
  label: string;
}

// Foto reali già presenti della pensione, da proporre come materiale per la
// promozione: foto dei pet, foto del diario (con nome del pet quando
// disponibile) e il logo della pensione. Nessuna immagine viene generata,
// come deciso dal titolare per restare autentici e senza costi extra.
export function usePromoPhotoCandidates(tenantId: string | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["promo-photo-candidates", tenantId],
    queryFn: async (): Promise<PromoPhotoCandidate[]> => {
      if (!tenantId) return [];

      const [catsRes, diarioRes, tenantRes] = await Promise.all([
        supabase.from("cats").select("id, name, photo_url").eq("tenant_id", tenantId).not("photo_url", "is", null).limit(30),
        supabase.from("diario_entries").select("id, photo_path, cat:cats(name)").eq("tenant_id", tenantId).not("photo_path", "is", null).order("created_at", { ascending: false }).limit(20),
        supabase.from("tenants").select("logo_url").eq("id", tenantId).single(),
      ]);

      const catPhotos: PromoPhotoCandidate[] = (catsRes.data ?? [])
        .filter((c) => !!c.photo_url)
        .map((c) => ({ url: c.photo_url as string, label: c.name }));

      const diarioPhotos: PromoPhotoCandidate[] = (diarioRes.data ?? []).map((d) => {
        const cat = d.cat as { name: string } | null;
        return {
          url: supabase.storage.from("diario-photos").getPublicUrl(d.photo_path).data.publicUrl,
          label: cat?.name ? `Diario — ${cat.name}` : "Diario",
        };
      });

      const logoPhoto: PromoPhotoCandidate[] = tenantRes.data?.logo_url
        ? [{ url: tenantRes.data.logo_url, label: "Logo pensione" }]
        : [];

      return [...catPhotos, ...diarioPhotos, ...logoPhoto];
    },
    enabled: !!tenantId,
  });
}

export interface VideoSlide {
  photo_url: string;
  overlay_text: string;
}

export interface MarketingPromotion {
  id: string;
  tenant_id: string;
  created_at: string;
  context_note: string | null;
  photo_urls: string[];
  social_caption: string | null;
  social_hashtags: string | null;
  google_ad_headline: string | null;
  google_ad_description: string | null;
  video_slides: VideoSlide[];
}

export function useGenerateMarketingPromo() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tenant_id: string; photo_urls: string[]; context_note?: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-marketing-promo", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.promotion as MarketingPromotion;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["marketing-promotions", variables.tenant_id] });
    },
  });
}

export function useMarketingPromotions() {
  const { profile } = useAuth();
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["marketing-promotions", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("marketing_promotions")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as MarketingPromotion[];
    },
    enabled: !!profile?.tenant_id,
  });
}

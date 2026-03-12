import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTenantConfig } from "@/hooks/usePensioneConfig";

/**
 * Syncs the i18n language with the tenant's locale setting.
 * Place this hook in a top-level layout component.
 */
export function useTenantLocale() {
  const { i18n } = useTranslation();
  const { data: tenantConfig } = useTenantConfig();

  useEffect(() => {
    const locale = (tenantConfig as any)?.locale ?? "it";
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [tenantConfig, i18n]);
}

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { it } from "date-fns/locale/it";
import { enUS } from "date-fns/locale/en-US";

/**
 * Returns the correct date-fns locale object based on the current i18n language.
 */
export function useDateLocale() {
  const { i18n } = useTranslation();
  return useMemo(() => (i18n.language === "en" ? enUS : it), [i18n.language]);
}

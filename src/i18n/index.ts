import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import it from "./locales/it.json";
import en from "./locales/en.json";

const storedLang = localStorage.getItem("phm-lang");
const validLangs = ["it", "en"];
const initialLang = storedLang && validLangs.includes(storedLang) ? storedLang : "it";

i18n.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  lng: initialLang,
  fallbackLng: "it",
  interpolation: {
    escapeValue: false,
  },
});

// Persist language changes to localStorage
i18n.on("languageChanged", (lng) => {
  if (validLangs.includes(lng)) localStorage.setItem("phm-lang", lng);
});

export default i18n;

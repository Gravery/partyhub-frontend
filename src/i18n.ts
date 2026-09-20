import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import ptTranslation from './locales/pt/translation.json';

const resources = {
  en: { translation: enTranslation },
  pt: { translation: ptTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en', // Inglês é o padrão se o idioma do navegador não corresponder
    supportedLngs: ['en', 'pt'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly', // Reduz pt-BR, pt-PT para 'pt'
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'partyhub_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

// This file is responsible for setting up the i18next translation library
// and loading the translation resources for different languages.
// It imports the translation files for each supported language and initializes
// i18next with the appropriate configuration.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import tr from './tr';
import en from './en';
import de from './de';
import fr from './fr';
import zh from './zh';
import es from './es';
import ru from './ru';
import ar from './ar';
import hi from './hi';
import pt from './pt';
import ja from './ja';
import ko from './ko';

// Define language resources
const resources = {
  tr: { translation: tr },
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  zh: { translation: zh },
  es: { translation: es },
  ru: { translation: ru },
  ar: { translation: ar },
  hi: { translation: hi },
  pt: { translation: pt },
  ja: { translation: ja },
  ko: { translation: ko },
};

// i18n configuration
i18n.use(initReactI18next).init({
  resources,
  // Note: We're not setting a default language (lng) here anymore
  // The language will be determined by the LanguageContext based on device settings
  fallbackLng: 'en', // Language to use if translation is not found
  interpolation: {
    escapeValue: false, // React is already safe
  },
  compatibilityJSON: 'v4',
  react: {
    useSuspense: false, // Disable the use of Suspense
  },
});

export default i18n;

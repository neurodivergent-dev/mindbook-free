// This context manages the language settings of the application.
// It provides a way to change the language and persist the setting using AsyncStorage.
// It also integrates with the i18next library for internationalization.
// Import necessary libraries and hooks
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';

const LANGUAGE_KEY = '@language';
const FIRST_LAUNCH_KEY = '@first_launch';

// Define types for the language context
interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => Promise<void>;
  languages: Record<string, string>;
}

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const { i18n: i18nInstance } = useTranslation();

  // List of supported languages
  const supportedLanguages = useMemo(
    () => ['tr', 'en', 'de', 'fr', 'zh', 'es', 'ru', 'ar', 'hi', 'pt', 'ja', 'ko'],
    []
  );

  const loadLanguageSetting = useCallback(async () => {
    try {
      // Debug: Log the raw locale value from expo-localization
      console.log('Raw Localization.locale:', Localization.locale);
      console.log('All Localization data:', JSON.stringify(Localization, null, 2));

      // Check if this is the first launch
      const isFirstLaunch = (await AsyncStorage.getItem(FIRST_LAUNCH_KEY)) === null;
      console.log('Is first launch?', isFirstLaunch);

      // Get saved language preference
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      console.log('Saved language:', savedLanguage);

      // Get device language
      const deviceLanguageCode = Localization.locale.split('-')[0]; // Get language code without region (e.g., 'en' from 'en-US')
      console.log('Device language code:', deviceLanguageCode);

      if (isFirstLaunch) {
        // First launch - use device language if supported
        console.log('First launch detected, setting language based on device');
        await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'false');

        if (supportedLanguages.includes(deviceLanguageCode)) {
          // Use device language
          setCurrentLanguage(deviceLanguageCode);
          await i18nInstance.changeLanguage(deviceLanguageCode);
          await AsyncStorage.setItem(LANGUAGE_KEY, deviceLanguageCode);
          console.log(`Using device language: ${deviceLanguageCode}`);
        } else {
          // Device language not supported, use English as default
          setCurrentLanguage('en');
          await i18nInstance.changeLanguage('en');
          await AsyncStorage.setItem(LANGUAGE_KEY, 'en');
          console.log(`Device language ${deviceLanguageCode} not supported, using English`);
        }
      } else if (savedLanguage) {
        // Not first launch and has saved preference
        setCurrentLanguage(savedLanguage);
        await i18nInstance.changeLanguage(savedLanguage);
        console.log(`Using saved language preference: ${savedLanguage}`);
      } else {
        // Not first launch but no saved preference (unusual case)
        if (supportedLanguages.includes(deviceLanguageCode)) {
          setCurrentLanguage(deviceLanguageCode);
          await i18nInstance.changeLanguage(deviceLanguageCode);
          await AsyncStorage.setItem(LANGUAGE_KEY, deviceLanguageCode);
        } else {
          setCurrentLanguage('en');
          await i18nInstance.changeLanguage('en');
          await AsyncStorage.setItem(LANGUAGE_KEY, 'en');
        }
      }
    } catch (error) {
      console.error('Error loading language settings:', error);
      // Fallback to English in case of error
      setCurrentLanguage('en');
      await i18nInstance.changeLanguage('en');
    }
  }, [i18nInstance, supportedLanguages]);

  useEffect(() => {
    loadLanguageSetting();
  }, [loadLanguageSetting]);

  const changeLanguage = async (language: string) => {
    try {
      setCurrentLanguage(language);
      await i18nInstance.changeLanguage(language);
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.error('Language switching error:', error);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        languages: {
          tr: 'Türkçe',
          en: 'English',
          de: 'Deutsch',
          fr: 'Français',
          zh: '中文',
          es: 'Español',
          ru: 'Русский',
          ar: 'العربية',
          hi: 'हिंदी',
          pt: 'Português',
          ja: '日本語',
          ko: '한국어',
        },
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageProvider;

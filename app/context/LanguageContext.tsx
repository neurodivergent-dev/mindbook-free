// This context manages the language settings of the application.
// It provides a way to change the language and persist the setting using AsyncStorage.
// It also integrates with the i18next library for internationalization.
// Import necessary libraries and hooks
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const LANGUAGE_KEY = '@language';

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

  const loadLanguageSetting = useCallback(async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
        await i18nInstance.changeLanguage(savedLanguage);
      } else {
        await AsyncStorage.setItem(LANGUAGE_KEY, 'en');
        setCurrentLanguage('en');
        await i18nInstance.changeLanguage('en');
      }
    } catch (error) {
      setCurrentLanguage('en');
      await i18nInstance.changeLanguage('en');
    }
  }, [i18nInstance]);

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

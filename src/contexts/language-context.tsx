
'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import enTranslations from '@/locales/en.json';
import teTranslations from '@/locales/te.json';
import hiTranslations from '@/locales/hi.json';

const translations: Record<string, any> = {
  en: enTranslations,
  te: teTranslations,
  hi: hiTranslations,
};

type LanguageContextType = {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState('en');

  const t = useCallback((key: string, options?: { [key: string]: string | number }) => {
    let translation = (translations[language] && translations[language][key]) || translations['en'][key] || key;
    if (options) {
      Object.keys(options).forEach(k => {
        translation = translation.replace(`{{${k}}}`, String(options[k]));
      });
    }
    return translation;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t
  }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

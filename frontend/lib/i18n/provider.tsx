"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";

import {
  defaultLanguage,
  getFrontendMessageTranslationKey,
  getStatusTranslationKey,
  interpolateTranslation,
  languageCookieName,
  resolveLanguage,
  translations,
  type Language,
  type TranslationKey,
  type TranslationValues,
} from "@/lib/i18n/translations";

type TranslationContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  translateFrontendMessage: (message: string) => string;
  translateStatus: (status: string) => string;
};

type LanguageProviderProps = {
  children: ReactNode;
  initialLanguage?: Language;
};

export const TranslationContext = createContext<TranslationContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLanguage = defaultLanguage,
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    document.cookie = `${languageCookieName}=${language}; path=/; max-age=31536000; samesite=lax`;
  }, [language]);

  function setLanguage(nextLanguage: Language) {
    setLanguageState(resolveLanguage(nextLanguage));
  }

  function t(key: TranslationKey, values?: TranslationValues) {
    const template = translations[language][key] ?? translations.en[key] ?? key;
    return interpolateTranslation(template, values);
  }

  function translateFrontendMessage(message: string) {
    const translationKey = getFrontendMessageTranslationKey(message);

    if (translationKey === null) {
      return message;
    }

    return t(translationKey);
  }

  function translateStatus(status: string) {
    const translationKey = getStatusTranslationKey(status);

    if (translationKey === null) {
      return status;
    }

    return t(translationKey);
  }

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translateFrontendMessage,
        translateStatus,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

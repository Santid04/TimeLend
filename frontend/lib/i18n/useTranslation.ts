"use client";

import { useContext } from "react";

import { TranslationContext } from "@/lib/i18n/provider";

export function useTranslation() {
  const context = useContext(TranslationContext);

  if (context === null) {
    throw new Error("useTranslation must be used within a LanguageProvider.");
  }

  return context;
}

"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";
import { availableLanguages } from "../help/helpData";

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  languages: { code: string; name: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [currentLanguage, setCurrentLanguage] = useState("en"); // Default language

  const setLanguage = (lang: string) => {
    if (availableLanguages.some((l) => l.code === lang)) {
      setCurrentLanguage(lang);
    } else {
      console.warn(`Language code '${lang}' not supported.`);
    }
  };

  return (
    <LanguageContext.Provider
      value={{ currentLanguage, setLanguage, languages: availableLanguages }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

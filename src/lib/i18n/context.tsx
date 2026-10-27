"use client";

import React, { createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { type Locale, type Dictionary, getDictionary } from "./index";

interface I18nContextType {
  locale: Locale;
  t: Dictionary;
  setLocale: (newLocale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = getDictionary(locale);

  const setLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // Replace locale in path if present, e.g. /en/dashboard -> /bn/dashboard
    if (pathname) {
      const segments = pathname.split("/");
      if (segments[1] === "en" || segments[1] === "bn") {
        segments[1] = newLocale;
        router.push(segments.join("/"));
        return;
      }
      router.push(`/${newLocale}${pathname}`);
      return;
    }
    router.push(`/${newLocale}/dashboard`);
  };

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

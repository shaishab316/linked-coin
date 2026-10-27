import React from "react";
import { notFound } from "next/navigation";
import { LOCALES, isValidLocale, type Locale } from "../../lib/i18n";
import { I18nProvider } from "../../lib/i18n/context";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return <I18nProvider locale={locale as Locale}>{children}</I18nProvider>;
}

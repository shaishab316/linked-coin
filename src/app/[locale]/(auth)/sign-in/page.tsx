import React from "react";
import { isSignUpEnabled } from "../../../../lib/config/env";
import { SignInForm } from "./sign-in-form";

interface SignInPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function LocalizedSignInPage({ params }: SignInPageProps) {
  const { locale } = await params;
  const signupEnabled = isSignUpEnabled();

  return <SignInForm locale={locale} signupEnabled={signupEnabled} />;
}

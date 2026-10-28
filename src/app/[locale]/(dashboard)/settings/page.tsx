import React from "react";
import { requireUser } from "../../../../features/auth/service";
import { getUserProfile } from "../../../../features/users/service";
import { getDictionary, type Locale } from "../../../../lib/i18n";
import { ProfileSettingsForm } from "../../../../features/users/components/profile-settings-form";
import { Settings } from "lucide-react";

interface SettingsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const user = await requireUser();
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);

  const profile = await getUserProfile(user.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-slate-200 border border-slate-700">
            <Settings className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
              {locale === "bn" ? "অ্যাকাউন্ট সেটিংস" : "Account Settings"}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              {locale === "bn"
                ? "আপনার নাম ও পুরো অ্যাপ্লিকেশনের মাস্টার টাইমজোন কনফিগার করুন"
                : "Manage your display name and master application timezone"}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <ProfileSettingsForm initialProfile={profile} />
    </div>
  );
}

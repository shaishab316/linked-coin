"use client";

import React, { useState } from "react";
import { updateUserProfileAction } from "../actions";
import { useI18n } from "../../../lib/i18n/context";
import {
  COMMON_TIMEZONES,
  getZonedDateParts,
  formatZonedHourLabel,
  isValidTimezone,
} from "../../../lib/date/timezone";
import { toast } from "sonner";
import { User, Clock, Check, Globe, Shield, Sparkles } from "lucide-react";

interface ProfileSettingsFormProps {
  initialProfile: {
    id: string;
    username: string;
    name: string | null;
    timezone: string;
  };
}

export function ProfileSettingsForm({ initialProfile }: ProfileSettingsFormProps) {
  const { locale, t } = useI18n();
  const [name, setName] = useState(initialProfile.name || "");
  const [timezone, setTimezone] = useState(initialProfile.timezone || "Asia/Dhaka");
  const [customTimezone, setCustomTimezone] = useState("");
  const [showCustomTz, setShowCustomTz] = useState(
    !COMMON_TIMEZONES.some((tz) => tz.value === initialProfile.timezone),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Active target timezone
  const activeTz = showCustomTz ? customTimezone || timezone : timezone;

  // Live preview time in active timezone
  const tzParts = getZonedDateParts(new Date(), isValidTimezone(activeTz) ? activeTz : "Asia/Dhaka");
  const timePreview = `${formatZonedHourLabel(tzParts.hour)}:${tzParts.minuteStr} (${tzParts.dateKey})`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setSavedSuccess(false);

    const tzToSave = showCustomTz ? customTimezone.trim() : timezone;

    if (showCustomTz && !isValidTimezone(tzToSave)) {
      toast.error(`Invalid timezone "${tzToSave}". Please enter a valid IANA timezone name.`);
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("timezone", tzToSave);

    const res = await updateUserProfileAction(formData);
    setIsLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      setSavedSuccess(true);
      toast.success(
        locale === "bn"
          ? "প্রোফাইল ও টাইমজোন সফলভাবে আপডেট হয়েছে!"
          : "Profile & timezone updated successfully!",
      );
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* 1. Profile Name & Username Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {locale === "bn" ? "ব্যবহারকারী পরিচয় ও নাম" : "Personal Profile"}
            </h3>
            <p className="text-xs text-slate-400">
              {locale === "bn"
                ? "আপনার নাম শেয়ার করা লেজার এবং স্টেটমেন্টে প্রদর্শিত হবে"
                : "Your name is shown in shared statements and PDF ledgers"}
            </p>
          </div>
        </div>

        {/* Display Name Input */}
        <div className="space-y-2">
          <label
            htmlFor="profile-name"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
          >
            {locale === "bn" ? "পুরো নাম (Display Name)" : "Full Display Name"}
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Shaishab Chandra Shil"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-sm"
          />
          <p className="text-[11px] text-slate-400">
            {locale === "bn"
              ? "যখন আপনি কারও সাথে লেজার শেয়ার করবেন, তখন এটি 'Ledger shared by ' হিসেবে প্রদর্শিত হবে।"
              : 'Used on public shared statements: "Ledger shared by ' + (name || "@" + initialProfile.username) + '"'}
          </p>
        </div>

        {/* Username (Read-Only) */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {locale === "bn" ? "ইউজারনেম (Username)" : "Username"}
          </label>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-slate-400 text-sm select-none">
            <Shield className="h-4 w-4 text-slate-500" />
            <span className="font-mono">@{initialProfile.username}</span>
            <span className="ml-auto text-[10px] text-slate-600 uppercase font-semibold">Account ID</span>
          </div>
        </div>
      </div>

      {/* 2. Application Timezone Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {locale === "bn" ? "অ্যাপ্লিকেশন টাইমজোন (Timezone)" : "App Master Timezone"}
            </h3>
            <p className="text-xs text-slate-400">
              {locale === "bn"
                ? "পুরো অ্যাপ্লিকেশনের সব হিসাব, ঘণ্টা ও দৈনিক ক্যাশ ফ্লো এই টাইমজোনে চলবে"
                : "Master timezone governing all hourly cash flow, daily timelines, and statements"}
            </p>
          </div>
        </div>

        {/* Timezone Select */}
        <div className="space-y-2">
          <label
            htmlFor="profile-timezone"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
          >
            {locale === "bn" ? "টাইমজোন নির্বাচন করুন" : "Select Master Timezone"}
          </label>

          {!showCustomTz ? (
            <select
              id="profile-timezone"
              value={timezone}
              onChange={(e) => {
                if (e.target.value === "CUSTOM") {
                  setShowCustomTz(true);
                  setCustomTimezone(timezone);
                } else {
                  setTimezone(e.target.value);
                }
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition text-sm cursor-pointer"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
              <option value="CUSTOM">-- Other / Custom IANA Timezone --</option>
            </select>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTimezone}
                  onChange={(e) => setCustomTimezone(e.target.value)}
                  placeholder="e.g. Asia/Dhaka, Europe/London"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowCustomTz(false)}
                  className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  List
                </button>
              </div>
            </div>
          )}

          {/* Live Timezone Clock Preview */}
          <div className="mt-3 flex items-center justify-between p-3 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-medium">
              <Globe className="h-4 w-4 text-cyan-400" />
              <span>Active Clock:</span>
              <span className="font-bold text-white font-mono">{timePreview}</span>
            </div>
            <span className="text-[11px] text-cyan-400 font-mono font-semibold">
              {activeTz}
            </span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {savedSuccess ? (
            <>
              <Check className="h-4 w-4 text-white" />
              <span>{locale === "bn" ? "সংরক্ষিত হয়েছে!" : "Saved!"}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>{isLoading ? "Saving..." : locale === "bn" ? "পরিবর্তন সংরক্ষণ করুন" : "Save Settings"}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

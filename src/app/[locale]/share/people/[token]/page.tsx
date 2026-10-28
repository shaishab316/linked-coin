import React from "react";
import Link from "next/link";
import { resolveSharedPerson, getSharedPersonTransactions } from "../../../../../features/people/share-service";
import { SharedStatementExplorer } from "../../../../../features/people/components/shared-statement-explorer";
import { ShieldAlert, Clock, Ban, ArrowLeft } from "lucide-react";
import type { Locale } from "../../../../../lib/i18n";

interface SharedPersonPageProps {
  params: Promise<{
    locale: string;
    token: string;
  }>;
}

export default async function SharedPersonStatementPage({ params }: SharedPersonPageProps) {
  const { locale: rawLocale, token } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";

  const resolved = await resolveSharedPerson(token);

  if (!resolved.valid || !resolved.person || !resolved.owner || !resolved.link) {
    const isExpired = resolved.reason === "expired";
    const isRevoked = resolved.reason === "revoked";

    return (
      <div className="min-h-screen bg-[#070b13] text-slate-100 flex items-center justify-center p-6 selection:bg-rose-500/30">
        <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-center space-y-6 shadow-2xl backdrop-blur-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 mx-auto shadow-inner">
            {isExpired ? (
              <Clock className="h-8 w-8" />
            ) : isRevoked ? (
              <Ban className="h-8 w-8" />
            ) : (
              <ShieldAlert className="h-8 w-8" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-100">
              {isExpired
                ? "Statement Link Expired"
                : isRevoked
                ? "Statement Link Revoked"
                : "Invalid Statement Link"}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isExpired
                ? "This shared ledger link has reached its expiration time limit. Please contact the account owner to generate a fresh statement link."
                : isRevoked
                ? "This shared link was permanently revoked by the owner. Access to this transaction statement is no longer available."
                : "This link is invalid or may have been removed. Please verify that the complete token URL was pasted."}
            </p>
          </div>

          <div className="border-t border-slate-800/80 pt-4 text-[11px] text-slate-500">
            <span>Linked Coin Cryptographic Ledger Security</span>
          </div>
        </div>
      </div>
    );
  }

  // Fetch transactions for this person
  const transactions = await getSharedPersonTransactions(
    resolved.link.userId,
    resolved.person.id,
    resolved.person.name,
  );

  return (
    <SharedStatementExplorer
      person={{
        id: resolved.person.id,
        name: resolved.person.name,
        contact: resolved.person.contact,
        notes: resolved.person.notes,
        outstandingMinor: resolved.person.outstandingMinor,
      }}
      owner={resolved.owner}
      link={{
        token: resolved.link.token,
        label: resolved.link.label,
        expiresAt: resolved.link.expiresAt ? resolved.link.expiresAt.toISOString() : null,
        createdAt: resolved.link.createdAt ? resolved.link.createdAt.toISOString() : undefined,
      }}
      transactions={transactions}
      currency="BDT"
      locale={locale}
    />
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  X,
  Copy,
  Check,
  Clock,
  Shield,
  ExternalLink,
  Ban,
  Calendar,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  createShareLinkAction,
  revokeShareLinkAction,
  getPersonShareLinksAction,
} from "../share-actions";

interface SharePersonDialogProps {
  person: {
    id: string;
    name: string;
  };
  locale?: string;
}

interface ShareLinkItem {
  id: string;
  token: string;
  label: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
}

export function SharePersonDialog({ person, locale = "en" }: SharePersonDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");
  const [expiresInDays, setExpiresInDays] = useState<number | null>(7);
  const [label, setLabel] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLinkUrl, setGeneratedLinkUrl] = useState<string | null>(null);
  const [links, setLinks] = useState<ShareLinkItem[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function loadLinks() {
    setIsLoadingLinks(true);
    try {
      const data = await getPersonShareLinksAction(person.id);
      setLinks(data);
    } catch {
      toast.error("Failed to load existing share links");
    } finally {
      setIsLoadingLinks(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadLinks();
    }
  }, [isOpen, person.id]);

  function getShareUrl(token: string) {
    if (typeof window === "undefined") return `/share/people/${token}`;
    return `${window.location.origin}/${locale}/share/people/${token}`;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedLinkUrl(null);

    try {
      const res = await createShareLinkAction({
        personId: person.id,
        expiresInDays,
        label: label.trim() || undefined,
      });

      if (res?.success && res.link) {
        const fullUrl = getShareUrl(res.link.token);
        setGeneratedLinkUrl(fullUrl);
        toast.success("Secure share link generated!");
        loadLinks();
      } else {
        toast.error("Failed to generate link");
      }
    } catch {
      toast.error("Failed to generate share link");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRevoke(linkId: string) {
    setRevokingId(linkId);
    try {
      const res = await revokeShareLinkAction(linkId, person.id);
      if (res?.success) {
        toast.success("Share link revoked. It can no longer be accessed.");
        setLinks((prev) =>
          prev.map((l) => (l.id === linkId ? { ...l, revokedAt: new Date().toISOString() } : l)),
        );
      } else {
        toast.error("Failed to revoke share link");
      }
    } catch {
      toast.error("Failed to revoke share link");
    } finally {
      setRevokingId(null);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Link copied to clipboard!");
    setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2500);
  }

  function getLinkStatus(link: ShareLinkItem) {
    if (link.revokedAt) {
      return { status: "revoked", label: "Revoked", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
    }
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      return { status: "expired", label: "Expired", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
    }
    return { status: "active", label: "Active", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  }

  function formatExpiry(expiresAt: string | null) {
    if (!expiresAt) return "Unlimited (Never expires)";
    const date = new Date(expiresAt);
    const msRemaining = date.getTime() - Date.now();
    if (msRemaining <= 0) return `Expired on ${date.toLocaleDateString()}`;
    const days = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    if (days === 1) return "Expires in 24 hours";
    return `Expires in ${days} days (${date.toLocaleDateString()})`;
  }

  const activeLinksCount = links.filter(
    (l) => !l.revokedAt && (!l.expiresAt || new Date(l.expiresAt).getTime() > Date.now()),
  ).length;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setGeneratedLinkUrl(null);
        }}
        className="flex items-center gap-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 transition shadow-sm"
        title="Share statement link with this person"
      >
        <Share2 className="h-3.5 w-3.5 text-cyan-400" />
        <span>Share Statement</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-md space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-sm">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Share Statement with {person.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Create a secure, read-only link with full control over expiration and revocation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab Switcher: Generate New Link vs Manage Links */}
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  activeTab === "create"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                Create New Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("manage");
                  loadLinks();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
                  activeTab === "manage"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <span>Manage Links</span>
                {links.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      activeLinksCount > 0
                        ? "bg-cyan-500/30 text-cyan-200"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {links.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: CREATE NEW SHARE LINK */}
            {activeTab === "create" && (
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Expiration Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-cyan-400" />
                      Link Expiration
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {expiresInDays === null ? "Unlimited / No expiry" : `Expires in ${expiresInDays} days`}
                    </span>
                  </label>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { days: 1, label: "24 Hours" },
                      { days: 7, label: "7 Days" },
                      { days: 30, label: "30 Days" },
                      { days: null, label: "Unlimited" },
                    ].map((opt) => {
                      const isSelected = expiresInDays === opt.days;
                      return (
                        <button
                          key={String(opt.days)}
                          type="button"
                          onClick={() => setExpiresInDays(opt.days)}
                          className={`px-2.5 py-2 rounded-xl text-xs font-bold text-center border transition cursor-pointer ${
                            isSelected
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-950"
                              : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Unlimited links remain active until you manually revoke them in &quot;Manage Links&quot;.
                  </p>
                </div>

                {/* Optional Note / Purpose Label */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-cyan-400" />
                    Internal Label / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Loan settlement review"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                {/* Generate Button */}
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 py-2.5 text-xs font-bold text-slate-950 shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                      <span>Generating Cryptographic Token...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 text-slate-950" />
                      <span>Generate Secure Share Link</span>
                    </>
                  )}
                </button>

                {/* Newly Generated Link Result Display */}
                {generatedLinkUrl && (
                  <div className="mt-4 rounded-2xl border border-cyan-500/40 bg-cyan-950/30 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                      <span className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-emerald-400" />
                        Link Ready to Share
                      </span>
                      <span className="text-[11px] text-cyan-400/80 font-normal">
                        {expiresInDays ? `Valid for ${expiresInDays} days` : "Unlimited duration"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedLinkUrl}
                        className="flex-1 rounded-xl border border-cyan-500/30 bg-slate-950/90 px-3 py-2 text-xs font-mono text-cyan-200 focus:outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedLinkUrl, "newly-generated")}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                          copiedId === "newly-generated"
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                        }`}
                      >
                        {copiedId === "newly-generated" ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>No account required to view statement.</span>
                      <a
                        href={generatedLinkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>Preview view</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* TAB 2: MANAGE EXISTING LINKS & REVOCATION */}
            {activeTab === "manage" && (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Manage link access and revocation</span>
                  <button
                    type="button"
                    onClick={loadLinks}
                    className="flex items-center gap-1 hover:text-cyan-400 transition"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingLinks ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {isLoadingLinks ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    <span>Loading share links...</span>
                  </div>
                ) : links.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                    <Shield className="h-8 w-8 text-slate-700 mx-auto" />
                    <p>No share links created for this person yet.</p>
                  </div>
                ) : (
                  links.map((link) => {
                    const statusObj = getLinkStatus(link);
                    const linkUrl = getShareUrl(link.token);
                    const isRevoked = !!link.revokedAt;
                    const isCopied = copiedId === link.id;

                    return (
                      <div
                        key={link.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2.5 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusObj.color}`}
                              >
                                {statusObj.label}
                              </span>
                              <span className="text-xs font-semibold text-slate-200">
                                {link.label || `Statement Link`}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {formatExpiry(link.expiresAt)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!isRevoked && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(linkUrl, link.id)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-medium border flex items-center gap-1 transition ${
                                  isCopied
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700"
                                }`}
                                title="Copy link"
                              >
                                {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                <span>{isCopied ? "Copied" : "Copy"}</span>
                              </button>
                            )}

                            {!isRevoked && (
                              <button
                                type="button"
                                disabled={revokingId === link.id}
                                onClick={() => {
                                  if (confirm("Revoke this link? Anyone with this link will immediately lose access.")) {
                                    handleRevoke(link.id);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-xl text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition flex items-center gap-1"
                                title="Revoke link permanently"
                              >
                                {revokingId === link.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Ban className="h-3 w-3" />
                                )}
                                <span>Revoke</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/60 pt-2 font-mono">
                          <span>Token: {link.token.slice(0, 16)}...</span>
                          <span>Views: {link.accessCount}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

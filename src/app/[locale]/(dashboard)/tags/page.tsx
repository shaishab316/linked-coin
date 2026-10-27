import React from "react";
import { requireUser } from "../../../../features/auth/service";
import { listTags, buildTagTree, type TagTreeNode } from "../../../../features/tags/service";
import { CreateTagDialog } from "../../../../features/tags/components/create-tag-dialog";
import { archiveTagAction, restoreTagAction } from "../../../../features/tags/actions";
import { getDictionary, type Locale } from "../../../../lib/i18n";
import { Tag as TagIcon, ChevronRight, Archive, RotateCcw, Users, Wallet, ReceiptText } from "lucide-react";
import type { TagType } from "../../../../db/schema";

interface LocalizedTagsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

const TYPE_META: Record<TagType, { label: string; labelBn: string; icon: typeof TagIcon; color: string }> = {
  transaction: {
    label: "Transaction Tags",
    labelBn: "লেনদেনের ট্যাগ",
    icon: ReceiptText,
    color: "text-emerald-400",
  },
  person: {
    label: "Person Tags",
    labelBn: "ব্যক্তির ট্যাগ",
    icon: Users,
    color: "text-blue-400",
  },
  account: {
    label: "Account Tags",
    labelBn: "হিসাবের ট্যাগ",
    icon: Wallet,
    color: "text-amber-400",
  },
};

export default async function LocalizedTagsPage({ params }: LocalizedTagsPageProps) {
  const user = await requireUser();
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "bn" ? "bn" : "en";
  const t = getDictionary(locale);

  const allTags = await listTags(user.id, true);
  const activeTags = allTags.filter((tag) => !tag.archivedAt);
  const archivedTags = allTags.filter((tag) => tag.archivedAt);

  const tagTypes: TagType[] = ["transaction", "person", "account"];

  function renderTree(node: TagTreeNode, depth = 0) {
    return (
      <div key={node.id} className="space-y-2">
        <div
          className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 transition"
          style={{ marginLeft: `${depth * 28}px` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold">
              {depth > 0 ? (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              ) : (
                <TagIcon className="h-4 w-4 text-emerald-400" />
              )}
            </span>
            <div>
              <span className="font-semibold text-slate-100 text-sm">{node.name}</span>
              {node.description && (
                <span className="text-xs text-slate-400 ml-2">&bull; {node.description}</span>
              )}
            </div>
          </div>

          <form action={archiveTagAction.bind(null, node.id)}>
            <button
              type="submit"
              className="text-xs text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
              title={t.accounts.archiveAccount}
            >
              <Archive className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {node.children.map((child) => renderTree(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            {t.tags.title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {t.tags.subtitle}
          </p>
        </div>

        <CreateTagDialog existingTags={activeTags} />
      </div>

      {/* Grouped by Tag Type */}
      {tagTypes.map((type) => {
        const typeTags = activeTags.filter((tg) => tg.tagType === type);
        const tree = buildTagTree(typeTags);
        const meta = TYPE_META[type];
        const Icon = meta.icon;

        return (
          <div key={type} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
              <Icon className={`h-5 w-5 ${meta.color}`} />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                {locale === "bn" ? meta.labelBn : meta.label}
              </h3>
              <span className="text-xs text-slate-500 ml-auto">{typeTags.length}</span>
            </div>

            {tree.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                {t.tags.noTagsYet}
              </div>
            ) : (
              <div className="space-y-3">{tree.map((node) => renderTree(node, 0))}</div>
            )}
          </div>
        );
      })}

      {archivedTags.length > 0 && (
        <div className="pt-6 border-t border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t.accounts.archived} ({archivedTags.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {archivedTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800/60 bg-slate-950/40 text-xs text-slate-400"
              >
                <div className="flex items-center gap-2">
                  <span>{tag.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                    {tag.tagType}
                  </span>
                </div>
                <form action={restoreTagAction.bind(null, tag.id)}>
                  <button
                    type="submit"
                    className="text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

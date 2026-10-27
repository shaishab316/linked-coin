import { requireUser } from "../../../features/auth/service";
import { listTags, buildTagTree, type TagTreeNode } from "../../../features/tags/service";
import { CreateTagDialog } from "../../../features/tags/components/create-tag-dialog";
import { archiveTagAction, restoreTagAction } from "../../../features/tags/actions";

export default async function TagsPage() {
  const user = await requireUser();
  const allTags = await listTags(user.id, true);

  const activeTags = allTags.filter((t) => !t.archivedAt);
  const archivedTags = allTags.filter((t) => t.archivedAt);
  const tagTree = buildTagTree(activeTags);

  function renderTree(node: TagTreeNode, depth = 0) {
    return (
      <div key={node.id} className="space-y-2">
        <div
          className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 transition"
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold">{depth > 0 ? "↳" : "🏷️"}</span>
            <div>
              <span className="font-semibold text-white text-sm">{node.name}</span>
              {node.description && (
                <span className="text-xs text-slate-400 ml-2">&bull; {node.description}</span>
              )}
            </div>
          </div>

          <form action={archiveTagAction.bind(null, node.id)}>
            <button
              type="submit"
              className="text-[11px] text-slate-500 hover:text-rose-400 transition"
            >
              Archive
            </button>
          </form>
        </div>

        {node.children.map((child) => renderTree(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto" id="tags-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tags & Categories</h1>
          <p className="text-sm text-slate-400">
            Hierarchical categorization (e.g. Food &rarr; Groceries &rarr; Organic).
          </p>
        </div>

        <CreateTagDialog existingTags={activeTags} />
      </div>

      {/* Tags Tree Card */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-base font-bold text-white mb-4">Tag Hierarchy</h2>

        {tagTree.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No tags created yet. Click &quot;Add Tag&quot; above to organize your spending.
          </div>
        ) : (
          <div className="space-y-3">{tagTree.map((root) => renderTree(root))}</div>
        )}
      </div>

      {/* Archived Tags */}
      {archivedTags.length > 0 && (
        <div className="pt-6 border-t border-white/5">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Archived Tags ({archivedTags.length})
          </h2>
          <div className="space-y-2 opacity-60">
            {archivedTags.map((t) => (
              <div
                key={t.id}
                className="glass-card p-3 rounded-xl flex items-center justify-between text-xs"
              >
                <span className="text-slate-300 font-medium">{t.name} (Archived)</span>
                <form action={restoreTagAction.bind(null, t.id)}>
                  <button
                    type="submit"
                    className="text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    Restore
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

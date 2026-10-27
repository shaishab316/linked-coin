import { getDb } from "@/db";
import { requireUser } from "@/features/auth/session";
import { setTagArchivedAction } from "@/features/tags/actions";
import { CreateTagForm } from "@/features/tags/components/create-tag-form";
import { listTagsForUser, type TagRecord } from "@/features/tags/service";

export const dynamic = "force-dynamic";

type TagNode = TagRecord & { children: TagNode[] };

function buildTree(tags: TagRecord[]): TagNode[] {
  const nodes = new Map<string, TagNode>(
    tags.map((tag) => [tag.id, { ...tag, children: [] }]),
  );
  const roots: TagNode[] = [];

  for (const tag of tags) {
    const node = nodes.get(tag.id);

    if (!node) {
      continue;
    }

    const parent = tag.parentId ? nodes.get(tag.parentId) : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function TagList({
  nodes,
  depth = 0,
}: {
  nodes: TagNode[];
  depth?: number;
}) {
  return (
    <ul className={depth === 0 ? "space-y-2" : "mt-2 space-y-2 pl-4"}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {node.name}
                {node.archivedAt ? (
                  <span className="ml-2 text-xs text-ink-muted">archived</span>
                ) : null}
              </p>
              {node.description ? (
                <p className="truncate text-xs text-ink-muted">
                  {node.description}
                </p>
              ) : null}
            </div>

            <form action={setTagArchivedAction}>
              <input type="hidden" name="tagId" value={node.id} />
              <input
                type="hidden"
                name="archived"
                value={node.archivedAt ? "false" : "true"}
              />
              <button
                type="submit"
                className="rounded-md border border-border-subtle px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-surface-muted"
              >
                {node.archivedAt ? "Restore" : "Archive"}
              </button>
            </form>
          </div>

          {node.children.length > 0 ? (
            <TagList nodes={node.children} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default async function TagsPage() {
  const user = await requireUser();
  const tags = await listTagsForUser(getDb(), user.id);
  const activeTags = tags.filter((tag) => !tag.archivedAt);
  const tree = buildTree(tags);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
        <p className="text-sm text-ink-muted">
          Tags double as categories and can be nested, for example Food →
          Restaurants.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your tags</h2>

          {tree.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-subtle bg-white px-4 py-8 text-center text-sm text-ink-muted">
              No tags yet. Create one to categorize transactions.
            </p>
          ) : (
            <TagList nodes={tree} />
          )}
        </section>

        <aside className="rounded-lg border border-border-subtle bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold">New tag</h2>
          <CreateTagForm
            parentOptions={activeTags.map((tag) => ({
              id: tag.id,
              name: tag.name,
            }))}
          />
        </aside>
      </div>
    </div>
  );
}

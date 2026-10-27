"use client";

import { useState } from "react";
import { updatePersonAction } from "../actions";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";

interface EditPersonDialogProps {
  person: {
    id: string;
    name: string;
    contact?: string | null;
    notes?: string | null;
  };
  triggerVariant?: "icon" | "button";
}

export function EditPersonDialog({ person, triggerVariant = "icon" }: EditPersonDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const newName = formData.get("name") as string;
    const res = await updatePersonAction(person.id, formData);

    if (res?.error) {
      setError(res.error);
      toast.error(res.error);
      setIsLoading(false);
    } else {
      toast.success(`Contact renamed to "${newName}"`);
      setIsOpen(false);
      window.location.reload();
    }
  }

  return (
    <>
      {triggerVariant === "button" ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>Rename</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          title="Rename person"
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}

      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="glass-panel p-6 rounded-3xl max-w-md w-full border border-slate-700/80 bg-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="h-4 w-4 text-emerald-400" />
                Rename Contact / Edit Info
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={person.name}
                  required
                  autoFocus
                  placeholder="e.g. Tariqul Islam"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Contact / Phone / Email (Optional)
                </label>
                <input
                  type="text"
                  name="contact"
                  defaultValue={person.contact || ""}
                  placeholder="e.g. +8801700000000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Notes / Relationship (Optional)
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={person.notes || ""}
                  placeholder="Notes about this person..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

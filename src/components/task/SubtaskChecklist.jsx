import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

// Checklist subtask di dalam sebuah task. Badge "2/5" yang bisa dibuka.
// items: [{ id, title, done }]. onToggle/onAdd/onDelete dikelola parent.
export default function SubtaskChecklist({
  items = [],
  isAdmin = false,
  onToggle,
  onAdd,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  if (items.length === 0 && !isAdmin) return null;

  const done = items.filter((s) => s.done).length;
  const total = items.length;
  const allDone = total > 0 && done === total;

  const submit = (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onAdd(t);
    setTitle("");
  };

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors ${
          allDone ? "text-teal-600" : "text-zinc-400 hover:text-zinc-600"
        }`}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {total === 0 ? "Subtask" : `Subtask ${done}/${total}`}
      </button>

      {open && (
        <div className="mt-1 flex flex-col gap-1 border-l border-zinc-200 pl-2.5">
          {items.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.done}
                onChange={(e) => onToggle(s.id, e.target.checked)}
                className="h-3.5 w-3.5 shrink-0 accent-brand-500"
              />
              <span
                className={`flex-1 text-xs ${
                  s.done ? "text-zinc-400 line-through" : "text-zinc-700"
                }`}
              >
                {s.title}
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onDelete(s.id)}
                  className="text-zinc-300 transition-colors hover:text-rose-500"
                  aria-label="Hapus subtask"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}

          {isAdmin && (
            <form onSubmit={submit} className="mt-0.5 flex items-center gap-1.5">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tambah subtask…"
                className="h-6 flex-1 rounded border border-zinc-200 px-2 text-xs text-zinc-700 outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                className="inline-grid h-6 w-6 place-items-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Tambah"
              >
                <Plus size={13} />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

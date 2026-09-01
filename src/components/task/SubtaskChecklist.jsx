import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, UserPlus } from "lucide-react";
import { AvatarGroup } from "../ui/Avatar";
import { personName } from "../../lib/people";

// Checklist subtask di dalam sebuah task. Badge "2/5" yang bisa dibuka.
// items: [{ id, title, done, assignees: [personId] }].
// people: [{ id, first_name, last_name, email }] — buat picker assignee.
// onToggle/onAdd/onDelete/onSetAssignees dikelola parent.
export default function SubtaskChecklist({
  items = [],
  people = [],
  isAdmin = false,
  onToggle,
  onAdd,
  onDelete,
  onSetAssignees,
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pickerFor, setPickerFor] = useState(null); // subtask id

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

  const toggleAssignee = (sub, personId) => {
    const cur = sub.assignees ?? [];
    const next = cur.includes(personId)
      ? cur.filter((x) => x !== personId)
      : [...cur, personId];
    onSetAssignees(sub.id, next);
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
        <div className="mt-1 flex flex-col gap-1.5 border-l border-zinc-200 pl-2.5">
          {items.map((s) => {
            const chosen = people.filter((p) => (s.assignees ?? []).includes(p.id));
            return (
              <div key={s.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
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

                  <button
                    type="button"
                    onClick={() =>
                      setPickerFor((cur) => (cur === s.id ? null : s.id))
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-50"
                    title="Atur assignee"
                  >
                    {chosen.length === 0 ? (
                      <>
                        <UserPlus size={12} /> Assign
                      </>
                    ) : (
                      <AvatarGroup
                        people={chosen.map((p) => ({
                          id: p.id,
                          name: personName(p),
                        }))}
                        size={18}
                        max={3}
                      />
                    )}
                  </button>

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

                {pickerFor === s.id && (
                  <div className="ml-6 flex flex-col rounded-lg border border-zinc-200 bg-white p-1">
                    {people.length === 0 ? (
                      <p className="px-2 py-1 text-[11px] text-zinc-400">
                        Belum ada orang buat di-assign.
                      </p>
                    ) : (
                      people.map((p) => (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 rounded px-2 py-1 text-xs text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          <input
                            type="checkbox"
                            checked={(s.assignees ?? []).includes(p.id)}
                            onChange={() => toggleAssignee(s, p.id)}
                            className="h-3.5 w-3.5 accent-brand-500"
                          />
                          <span className="truncate">{personName(p)}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

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

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, UserPlus } from "lucide-react";
import { AvatarGroup } from "../ui/Avatar";
import { personName } from "../../lib/people";

const POP_W = 208; // w-52

function popStyle(rect) {
  const gap = 4;
  const left = Math.max(
    8,
    Math.min(rect.right - POP_W, window.innerWidth - POP_W - 8)
  );
  const below = window.innerHeight - rect.bottom;
  if (below < 240 && rect.top > below) {
    return { left, bottom: window.innerHeight - rect.top + gap };
  }
  return { left, top: rect.bottom + gap };
}

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
  const [picker, setPicker] = useState(null); // { subId, rect }
  const popRef = useRef(null);

  useEffect(() => {
    if (!picker) return;
    const close = () => setPicker(null);
    const onKey = (e) => e.key === "Escape" && close();
    const onScroll = (e) => {
      if (popRef.current && popRef.current.contains(e.target)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [picker]);

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
    if (!sub) return;
    const cur = sub.assignees ?? [];
    const next = cur.includes(personId)
      ? cur.filter((x) => x !== personId)
      : [...cur, personId];
    onSetAssignees(sub.id, next);
  };

  const openPicker = (e, subId) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPicker((cur) => (cur?.subId === subId ? null : { subId, rect }));
  };

  const pickerSub = picker
    ? items.find((x) => x.id === picker.subId)
    : null;

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
            const chosen = people.filter((p) =>
              (s.assignees ?? []).includes(p.id)
            );
            return (
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

                <button
                  type="button"
                  onClick={(e) => openPicker(e, s.id)}
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-50 ${
                    picker?.subId === s.id
                      ? "border-brand-400 bg-brand-50"
                      : "border-zinc-200"
                  }`}
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
                    onClick={() => {
                      setPicker((c) => (c?.subId === s.id ? null : c));
                      onDelete(s.id);
                    }}
                    className="text-zinc-300 transition-colors hover:text-rose-500"
                    aria-label="Hapus subtask"
                  >
                    <Trash2 size={12} />
                  </button>
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

      {picker && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPicker(null)}
            aria-hidden="true"
          />
          <div
            ref={popRef}
            role="menu"
            style={{ ...popStyle(picker.rect), width: POP_W }}
            className="scroll-slim fixed z-50 max-h-56 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg"
          >
            {people.length === 0 ? (
              <p className="px-2 py-1.5 text-[11px] text-zinc-400">
                Belum ada orang buat di-assign.
              </p>
            ) : (
              people.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    checked={(pickerSub?.assignees ?? []).includes(p.id)}
                    onChange={() => toggleAssignee(pickerSub, p.id)}
                    className="h-3.5 w-3.5 accent-brand-500"
                  />
                  <span className="truncate">{personName(p)}</span>
                </label>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

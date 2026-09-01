import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, UserPlus } from "lucide-react";
import Avatar, { AvatarGroup } from "../ui/Avatar";
import { personName } from "../../lib/people";

const POP_W = 256; // w-64
const SEARCH_FROM = 7;

function popPosition(rect) {
  const gap = 6;
  const left = Math.max(
    8,
    Math.min(rect.right - POP_W, window.innerWidth - POP_W - 8)
  );
  const below = window.innerHeight - rect.bottom;
  const placement = below < 260 && rect.top > below ? "top" : "bottom";
  const style =
    placement === "top"
      ? { left, bottom: window.innerHeight - rect.top + gap, width: POP_W }
      : { left, top: rect.bottom + gap, width: POP_W };
  const caretLeft = Math.max(
    12,
    Math.min(rect.left + rect.width / 2 - left - 5, POP_W - 22)
  );
  return { style, placement, caretLeft };
}

// Checklist subtask di dalam sebuah task. Badge "2/5" yang bisa dibuka jadi
// panel ternested. items: [{ id, title, done, assignees: [personId] }].
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
  const [pquery, setPquery] = useState("");
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
    setPquery("");
    setPicker((cur) => (cur?.subId === subId ? null : { subId, rect }));
  };

  const pickerSub = picker ? items.find((x) => x.id === picker.subId) : null;
  const selectedCount = pickerSub?.assignees?.length ?? 0;
  const showSearch = people.length > SEARCH_FROM;
  const pq = pquery.trim().toLowerCase();
  const pickList = pq
    ? people.filter((p) => personName(p).toLowerCase().includes(pq))
    : people;
  const pos = picker ? popPosition(picker.rect) : null;

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
        <div className="mt-1.5 flex max-w-xl flex-col gap-0.5 rounded-lg border border-zinc-200/70 bg-zinc-50/60 p-2">
          {items.map((s) => {
            const chosen = people.filter((p) =>
              (s.assignees ?? []).includes(p.id)
            );
            return (
              <div
                key={s.id}
                className="group/strow flex items-center gap-2 rounded-md px-1 py-1 hover:bg-white"
              >
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={(e) => onToggle(s.id, e.target.checked)}
                  className="h-3.5 w-3.5 shrink-0 accent-brand-500"
                />
                <span
                  className={`min-w-0 flex-1 truncate text-xs ${
                    s.done ? "text-zinc-400 line-through" : "text-zinc-700"
                  }`}
                >
                  {s.title}
                </span>

                <button
                  type="button"
                  onClick={(e) => openPicker(e, s.id)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-50 ${
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
                    className="shrink-0 text-zinc-300 opacity-0 transition-opacity hover:text-rose-500 focus-visible:opacity-100 group-hover/strow:opacity-100"
                    aria-label="Hapus subtask"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}

          {isAdmin && (
            <form onSubmit={submit} className="mt-1 flex items-center gap-1.5 px-1">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tambah subtask…"
                className="h-7 flex-1 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700 outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Tambah"
              >
                <Plus size={14} />
              </button>
            </form>
          )}
        </div>
      )}

      {picker && pos && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPicker(null)}
            aria-hidden="true"
          />
          <div
            ref={popRef}
            role="menu"
            style={pos.style}
            className="fixed z-50 rounded-xl border border-zinc-200 bg-white shadow-lg ring-1 ring-black/[0.04]"
          >
            <span
              style={{ left: pos.caretLeft }}
              className={`absolute h-2.5 w-2.5 rotate-45 bg-white ${
                pos.placement === "top"
                  ? "-bottom-1 border-b border-r border-zinc-200"
                  : "-top-1 border-l border-t border-zinc-200"
              }`}
              aria-hidden="true"
            />
            <div className="flex items-center justify-between border-b border-zinc-100 px-2.5 py-2">
              <span className="text-[11px] font-semibold text-zinc-500">
                Assign ke
              </span>
              {selectedCount > 0 && (
                <span className="text-[11px] text-zinc-400">
                  {selectedCount} dipilih
                </span>
              )}
            </div>

            {showSearch && (
              <div className="border-b border-zinc-100 p-1.5">
                <input
                  value={pquery}
                  onChange={(e) => setPquery(e.target.value)}
                  placeholder="Cari orang…"
                  className="h-7 w-full rounded-md border border-zinc-200 px-2 text-xs text-zinc-700 outline-none focus:border-brand-500"
                />
              </div>
            )}

            <div className="scroll-slim max-h-60 overflow-y-auto p-1">
              {pickList.length === 0 ? (
                <p className="px-2 py-1.5 text-[11px] text-zinc-400">
                  {people.length === 0
                    ? "Belum ada orang buat di-assign."
                    : "Nggak ada yang cocok."}
                </p>
              ) : (
                pickList.map((p) => {
                  const checked = (pickerSub?.assignees ?? []).includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                        checked
                          ? "bg-brand-50/70 text-zinc-900"
                          : "text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <Avatar name={personName(p)} id={p.id} size={20} />
                      <span className="min-w-0 flex-1 truncate">
                        {personName(p)}
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAssignee(pickerSub, p.id)}
                        className="h-3.5 w-3.5 shrink-0 accent-brand-500"
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

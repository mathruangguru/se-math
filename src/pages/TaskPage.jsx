import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  List as ListIcon,
  Pencil,
  Plus,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Pagination from "../components/ui/Pagination";
import Modal from "../components/ui/Modal";
import SegmentedControl from "../components/ui/SegmentedControl";
import { AvatarGroup } from "../components/ui/Avatar";
import SubtaskChecklist from "../components/task/SubtaskChecklist";
import { useAuth } from "../context/auth-context";
import { shortDate, deadlineTone, deadlineLabel } from "../lib/date";
import { listPeople, personName } from "../lib/people";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  setTaskStatus,
  listSubtasks,
  createSubtask,
  deleteSubtask,
  setSubtaskDone,
  listSubtaskAssignees,
  setSubtaskAssignees,
} from "../lib/tasks";

const VIEW_KEY = "se-task-view";
const PER_PAGE = 50;
const PRIORITIES = ["P0", "P1", "P2", "P3", "P4"];
const STATUS_ORDER = ["todo", "doing", "done"];
const STATUSES = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "Dikerjakan" },
  { value: "done", label: "Selesai" },
];

const VIEWS = [
  { value: "list", label: "List", icon: ListIcon },
  { value: "table", label: "Tabel", icon: TableIcon },
  { value: "kanban", label: "Kanban", icon: Columns3 },
];

const emptyForm = {
  id: null,
  title: "",
  description: "",
  priority: "P2",
  status: "todo",
  deadline: "",
};
const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";
const filterCls =
  "h-9 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none transition-colors focus:border-brand-500 focus:bg-white";

const PRIO_BAR = {
  P0: "bg-rose-400/80",
  P1: "bg-brand-400/80",
  P2: "bg-amber-400/80",
  P3: "bg-sky-400/80",
  P4: "bg-zinc-300",
};
const STATUS_META = {
  todo: {
    label: "To do",
    dot: "bg-zinc-400",
    select: "border-zinc-200 bg-white text-zinc-600",
  },
  doing: {
    label: "Dikerjakan",
    dot: "bg-sky-500",
    select: "border-sky-200 bg-sky-50 text-sky-700",
  },
  done: {
    label: "Selesai",
    dot: "bg-teal-500",
    select: "border-teal-200 bg-teal-50 text-teal-700",
  },
};
const TONE_CLS = {
  overdue: "text-rose-600",
  soon: "text-amber-600",
  ok: "text-zinc-500",
};

// Chip netral — warna prioritas cuma dari bar aksen di kiri kartu, biar
// nggak nambah satu sistem warna lagi di tiap baris.
function PriorityChip({ p }) {
  return (
    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
      {p}
    </span>
  );
}

function Deadline({ task, bare = false }) {
  if (!task.deadline) return null;
  const tone = deadlineTone(task.deadline, task.status);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${
        TONE_CLS[tone] ?? "text-zinc-500"
      }`}
      title={shortDate(task.deadline)}
    >
      {!bare && <CalendarDays size={12} />}
      {deadlineLabel(task.deadline, task.status)}
    </span>
  );
}

// Urutan dalam grup List: prioritas (P0 dulu) lalu deadline terdekat.
function byPrioThenDeadline(a, b) {
  const p = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
  if (p !== 0) return p;
  if (a.deadline && b.deadline) {
    if (a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
    return 0;
  }
  if (a.deadline) return -1;
  if (b.deadline) return 1;
  return 0;
}

function readView() {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (VIEWS.some((x) => x.value === v)) return v;
  } catch {
    /* ignore */
  }
  return "list";
}

export default function TaskPage() {
  const { isAdmin, profile } = useAuth();
  const myId = profile?.id ?? null;

  const [rows, setRows] = useState([]);
  const [subs, setSubs] = useState([]); // flat se_subtask rows
  const [subAssignees, setSubAssignees] = useState([]); // { subtask_id, person_id }
  const [people, setPeople] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [msg, setMsg] = useState(null); // { ok, text }
  const [rowBusyId, setRowBusyId] = useState(null);

  const [view, setView] = useState(readView);
  const [q, setQ] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set(["done"]));
  const [page, setPage] = useState(1);

  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const changeView = (v) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const toggleCollapse = (statusValue) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(statusValue)) next.delete(statusValue);
      else next.add(statusValue);
      return next;
    });

  async function fetchTasks() {
    try {
      const [t, s, sa, p] = await Promise.all([
        listTasks(),
        listSubtasks(),
        listSubtaskAssignees().catch(() => []),
        listPeople().catch(() => []),
      ]);
      setRows(t);
      setSubs(s);
      setSubAssignees(sa);
      setPeople(p);
      setStatus("ready");
    } catch (err) {
      console.error("[task] gagal memuat:", err);
      setStatus("error");
    }
  }

  useEffect(() => {
    let alive = true;
    Promise.all([
      listTasks(),
      listSubtasks(),
      listSubtaskAssignees().catch(() => []),
      listPeople().catch(() => []),
    ])
      .then(([t, s, sa, p]) => {
        if (!alive) return;
        setRows(t);
        setSubs(s);
        setSubAssignees(sa);
        setPeople(p);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[task] gagal memuat:", err);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const personById = useMemo(() => {
    const m = new Map();
    for (const p of people) m.set(p.id, p);
    return m;
  }, [people]);

  const counts = useMemo(() => {
    const c = { todo: 0, doing: 0, done: 0 };
    for (const t of rows) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const subByTask = useMemo(() => {
    const m = new Map();
    for (const s of subs) {
      if (!m.has(s.task_id)) m.set(s.task_id, []);
      m.get(s.task_id).push(s);
    }
    return m;
  }, [subs]);

  const assigneesBySub = useMemo(() => {
    const m = new Map();
    for (const r of subAssignees) {
      if (!m.has(r.subtask_id)) m.set(r.subtask_id, []);
      m.get(r.subtask_id).push(r.person_id);
    }
    return m;
  }, [subAssignees]);

  // Rekap assignee per task = union assignee semua subtask-nya.
  const rollupByTask = useMemo(() => {
    const m = new Map();
    for (const [taskId, list] of subByTask) {
      const set = new Set();
      for (const s of list) {
        for (const pid of assigneesBySub.get(s.id) ?? []) set.add(pid);
      }
      if (set.size) m.set(taskId, [...set]);
    }
    return m;
  }, [subByTask, assigneesBySub]);

  const handleSubToggle = async (id, done) => {
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, done } : s)));
    try {
      await setSubtaskDone(id, done);
    } catch (err) {
      setSubs((prev) =>
        prev.map((s) => (s.id === id ? { ...s, done: !done } : s))
      );
      window.alert(`Gagal: ${err?.message ?? err}`);
    }
  };

  const handleSubAdd = async (taskId, title) => {
    try {
      const row = await createSubtask(taskId, title);
      setSubs((prev) => [...prev, row]);
    } catch (err) {
      window.alert(`Gagal menambah subtask: ${err?.message ?? err}`);
    }
  };

  const handleSubDelete = async (id) => {
    const keepSubs = subs;
    const keepAssignees = subAssignees;
    setSubs((prev) => prev.filter((s) => s.id !== id));
    setSubAssignees((prev) => prev.filter((r) => r.subtask_id !== id));
    try {
      await deleteSubtask(id);
    } catch (err) {
      setSubs(keepSubs);
      setSubAssignees(keepAssignees);
      window.alert(`Gagal menghapus subtask: ${err?.message ?? err}`);
    }
  };

  const handleSetSubAssignees = async (subtaskId, personIds) => {
    const keep = subAssignees;
    setSubAssignees((prev) => [
      ...prev.filter((r) => r.subtask_id !== subtaskId),
      ...personIds.map((pid) => ({ subtask_id: subtaskId, person_id: pid })),
    ]);
    try {
      await setSubtaskAssignees(subtaskId, personIds);
    } catch (err) {
      setSubAssignees(keep);
      window.alert(`Gagal ubah assignee: ${err?.message ?? err}`);
    }
  };

  const subChecklist = (t) => {
    const items = (subByTask.get(t.id) ?? []).map((s) => ({
      ...s,
      assignees: assigneesBySub.get(s.id) ?? [],
    }));
    return (
      <SubtaskChecklist
        items={items}
        people={people}
        isAdmin={isAdmin}
        onToggle={handleSubToggle}
        onAdd={(title) => handleSubAdd(t.id, title)}
        onDelete={handleSubDelete}
        onSetAssignees={handleSetSubAssignees}
      />
    );
  };

  const rollupAvatars = (t) => {
    const ids = rollupByTask.get(t.id) ?? [];
    if (ids.length === 0)
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className="h-5 w-5 rounded-full border border-dashed border-zinc-300" />
          Belum diassign
        </span>
      );
    return (
      <AvatarGroup
        people={ids.map((id) => {
          const p = personById.get(id);
          return { id, name: p ? personName(p) : "?" };
        })}
        size={20}
        max={4}
      />
    );
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((t) => {
      const ids = rollupByTask.get(t.id) ?? [];
      if (assigneeFilter === "__none" && ids.length > 0) return false;
      if (assigneeFilter === "__me" && !ids.includes(myId)) return false;
      if (
        assigneeFilter &&
        assigneeFilter !== "__none" &&
        assigneeFilter !== "__me" &&
        !ids.includes(assigneeFilter)
      )
        return false;
      if (!needle) return true;
      return (
        t.title.toLowerCase().includes(needle) ||
        (t.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, assigneeFilter, myId, rollupByTask]);

  // Balik ke halaman 1 tiap filter berubah (adjust state saat render).
  const filterKey = `${q} ${assigneeFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const shown = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };
  const openEdit = (t) => {
    setForm({ ...emptyForm, ...t, deadline: t.deadline ?? "" });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    const title = form.title.trim();
    if (!title) {
      setFormError("Judul wajib diisi.");
      return;
    }
    const payload = {
      title,
      description: form.description.trim(),
      priority: form.priority,
      status: form.status,
      deadline: form.deadline || null,
    };
    setSaving(true);
    try {
      if (form.id) {
        const updated = await updateTask(form.id, payload);
        setRows((prev) =>
          prev.map((r) => (r.id === form.id ? { ...r, ...updated } : r))
        );
      } else {
        await createTask(payload);
        await fetchTasks();
      }
      setShowForm(false);
      setForm(emptyForm);
      setMsg({ ok: true, text: "Tersimpan." });
    } catch (err) {
      setFormError(err?.message ?? "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Hapus task "${t.title}"?`)) return;
    setRowBusyId(t.id);
    try {
      await deleteTask(t.id);
      setRows((prev) => prev.filter((r) => r.id !== t.id));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
    }
  };

  const handleStatus = async (t, next) => {
    if (next === t.status) return;
    setRowBusyId(t.id);
    const prevStatus = t.status;
    setRows((prev) =>
      prev.map((r) => (r.id === t.id ? { ...r, status: next } : r))
    );
    try {
      await setTaskStatus(t.id, next);
    } catch (err) {
      setRows((prev) =>
        prev.map((r) => (r.id === t.id ? { ...r, status: prevStatus } : r))
      );
      window.alert(`Gagal ganti status: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
    }
  };

  // Helper render (dipanggil sebagai fungsi, bukan komponen — biar <select>
  // nggak remount tiap render parent).
  const statusSelect = (t) => (
    <select
      value={t.status}
      disabled={rowBusyId === t.id}
      onChange={(e) => handleStatus(t, e.target.value)}
      className={`rounded-lg border px-2 py-1 text-xs font-medium outline-none transition-colors focus:border-brand-500 disabled:opacity-50 ${
        STATUS_META[t.status]?.select ?? "border-zinc-200 bg-white text-zinc-600"
      }`}
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );

  const adminActions = (t) =>
    isAdmin && (
      <>
        <button
          onClick={() => openEdit(t)}
          className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Ubah"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => handleDelete(t)}
          disabled={rowBusyId === t.id}
          className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
          aria-label="Hapus"
        >
          <Trash2 size={14} />
        </button>
      </>
    );

  // List view kartunya pendek — kasih lebar terbatas biar kontrol nggak
  // kelempar jauh ke kanan. Tabel & kanban tetap butuh ruang lebar.
  const shellMax = view === "list" ? "max-w-[880px]" : "max-w-[1180px]";

  return (
    <div className={`mx-auto flex ${shellMax} flex-col gap-6`}>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Task</h1>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Board bersama — assignee diatur per subtask.
        </p>
      </div>

      {msg && (
        <p
          className={`text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}
        >
          {msg.text}
        </p>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl options={VIEWS} value={view} onChange={changeView} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari…"
          className="h-9 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white sm:max-w-[200px]"
        />
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className={filterCls}
        >
          <option value="">Semua orang</option>
          {myId && <option value="__me">Punya saya</option>}
          <option value="__none">Belum ada assignee</option>
          {people
            .filter((p) => p.id !== myId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {personName(p)}
              </option>
            ))}
        </select>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 sm:ml-auto"
          >
            <Plus size={14} strokeWidth={2.6} /> Tambah task
          </button>
        )}
      </div>

      {/* Form tambah / edit */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? "Ubah task" : "Task baru"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Judul
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Deskripsi
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={fieldCls}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-medium text-zinc-600">
              Prioritas
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className={fieldCls}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Status
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={fieldCls}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Deadline
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
                className={fieldCls}
              />
            </label>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Assignee diatur per subtask (di checklist tiap task), bukan di
            sini.
          </p>

          {formError && <p className="text-xs text-rose-600">{formError}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>

      {/* Ringkasan — satu baris teks */}
      {status === "ready" && rows.length > 0 && (
        <p className="-mt-2 text-xs text-zinc-400">
          {rows.length} task · {counts.todo} to do · {counts.doing} dikerjakan ·{" "}
          {counts.done} selesai
        </p>
      )}

      {/* Isi */}
      {status === "loading" ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : status === "error" ? (
        <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-12 text-center text-sm text-rose-500">
          Gagal memuat data.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada task{isAdmin ? ". Tambah satu." : "."}
        </p>
      ) : view === "list" ? (
        filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-8 text-center text-xs text-zinc-400">
            Nggak ada yang cocok.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {STATUSES.map((col) => {
              const items = filtered
                .filter((t) => t.status === col.value)
                .sort(byPrioThenDeadline);
              if (items.length === 0) return null;
              const isCollapsed = collapsed.has(col.value);
              return (
                <div key={col.value}>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(col.value)}
                    className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900"
                  >
                    {isCollapsed ? (
                      <ChevronRight size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        STATUS_META[col.value].dot
                      }`}
                    />
                    {col.label}
                    <span className="font-normal text-zinc-400">
                      {items.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white">
                      {items.map((t) => (
                        <div
                          key={t.id}
                          className="group relative flex flex-col gap-1 py-2.5 pl-4 pr-3 transition-colors hover:bg-zinc-50"
                        >
                          <span
                            className={`absolute inset-y-1 left-0 w-[3px] rounded-full ${
                              PRIO_BAR[t.priority] ?? PRIO_BAR.P2
                            }`}
                          />
                          <div className="flex items-center gap-2">
                            <p
                              className={`min-w-0 flex-1 truncate text-sm ${
                                t.status === "done"
                                  ? "font-medium text-zinc-400"
                                  : "font-semibold text-zinc-900"
                              }`}
                            >
                              {t.title}
                            </p>
                            <span className="shrink-0 text-[10px] font-semibold text-zinc-400">
                              {t.priority}
                            </span>
                            <span className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                              {statusSelect(t)}
                              {adminActions(t)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-400">
                            {rollupAvatars(t)}
                            <Deadline task={t} bare />
                            {subChecklist(t)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : view === "table" ? (
        <>
          <p className="text-xs text-zinc-400">
            {filtered.length.toLocaleString("id")} task
          </p>
          <div className="scroll-slim overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Judul</th>
                  <th className="px-4 py-3">Prio</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {shown.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-zinc-100 align-top transition-colors hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3">
                      <p
                        className={`text-sm font-medium ${
                          t.status === "done" ? "text-zinc-400" : "text-zinc-900"
                        }`}
                      >
                        {t.title}
                      </p>
                      {t.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
                          {t.description}
                        </p>
                      )}
                      {subChecklist(t)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            PRIO_BAR[t.priority] ?? PRIO_BAR.P2
                          }`}
                        />
                        <PriorityChip p={t.priority} />
                      </span>
                    </td>
                    <td className="px-4 py-3">{rollupAvatars(t)}</td>
                    <td className="px-4 py-3">{statusSelect(t)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Deadline task={t} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {adminActions(t)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
        </>
      ) : (
        // Kanban
        <div className="grid gap-4 sm:grid-cols-3">
          {STATUSES.map((col) => {
            const items = filtered.filter((t) => t.status === col.value);
            return (
              <div
                key={col.value}
                className="flex flex-col rounded-2xl border border-zinc-200/70 bg-zinc-50/70"
              >
                <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-zinc-600">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      STATUS_META[col.value].dot
                    }`}
                  />
                  {col.label}
                  <span className="ml-auto rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                    {items.length}
                  </span>
                </div>
                <div className="scroll-slim flex max-h-[70vh] flex-col gap-2 overflow-y-auto px-2 pb-2">
                  {items.map((t) => {
                    const idx = STATUS_ORDER.indexOf(t.status);
                    return (
                      <div
                        key={t.id}
                        className="group relative overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-3 pl-3.5"
                      >
                        <span
                          className={`absolute inset-y-0 left-0 w-[3px] ${
                            PRIO_BAR[t.priority] ?? PRIO_BAR.P2
                          }`}
                        />
                        <div className="flex items-start justify-between gap-2">
                          <PriorityChip p={t.priority} />
                          <div className="flex items-center opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                            {adminActions(t)}
                          </div>
                        </div>
                        <p
                          className={`mt-1.5 text-sm leading-snug ${
                            t.status === "done"
                              ? "font-medium text-zinc-400"
                              : "font-semibold text-zinc-900"
                          }`}
                        >
                          {t.title}
                        </p>
                        {t.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                            {t.description}
                          </p>
                        )}
                        <div className="mt-2">{rollupAvatars(t)}</div>
                        {subChecklist(t)}
                        <div className="mt-2 flex items-center justify-between">
                          <Deadline task={t} />
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                handleStatus(t, STATUS_ORDER[idx - 1])
                              }
                              disabled={idx <= 0 || rowBusyId === t.id}
                              className="inline-grid h-6 w-6 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                              aria-label="Mundur status"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <button
                              onClick={() =>
                                handleStatus(t, STATUS_ORDER[idx + 1])
                              }
                              disabled={idx >= 2 || rowBusyId === t.id}
                              className="inline-grid h-6 w-6 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                              aria-label="Maju status"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <p className="px-2 py-6 text-center text-[11px] text-zinc-300">
                      kosong
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

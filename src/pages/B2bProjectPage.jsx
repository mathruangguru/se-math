import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardCopy,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import Markdown from "../components/ui/Markdown";
import { useAuth } from "../context/auth-context";
import { shortDate } from "../lib/date";
import {
  getB2bProject,
  updateProjectSyllabus,
  listMilestones,
  createMilestone,
  updateMilestone,
  setMilestoneDone,
  deleteMilestone,
  listImportantDates,
  createImportantDate,
  updateImportantDate,
  deleteImportantDate,
} from "../lib/b2b";
import { listSyllabusTemplates } from "../lib/syllabus";
import {
  listTasksByProject,
  createTask,
  updateTask,
  deleteTask,
  setTaskStatus,
} from "../lib/tasks";

const STATUS_META = {
  berjalan: { label: "Berjalan", cls: "bg-sky-100 text-sky-700" },
  selesai: { label: "Selesai", cls: "bg-teal-100 text-teal-700" },
  batal: { label: "Batal", cls: "bg-zinc-100 text-zinc-500" },
};

const TASK_PRIORITIES = ["P0", "P1", "P2", "P3", "P4"];
const TASK_STATUSES = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "Dikerjakan" },
  { value: "done", label: "Selesai" },
];

const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";
const rowActionBtn =
  "inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700";
const rowDeleteBtn =
  "inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40";

const emptyMsForm = { id: null, title: "", target_date: "", done: false };
const emptyDateForm = { id: null, label: "", date_value: "", note: "" };
const emptyTaskForm = {
  id: null,
  title: "",
  description: "",
  priority: "P2",
  status: "todo",
  deadline: "",
};

export default function B2bProjectPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [msg, setMsg] = useState(null); // { ok, text }

  const [showInsert, setShowInsert] = useState(false);
  const [templates, setTemplates] = useState(null); // null = belum di-fetch
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [showEditSyllabus, setShowEditSyllabus] = useState(false);
  const [syllabusDraft, setSyllabusDraft] = useState("");
  const [syllabusSaving, setSyllabusSaving] = useState(false);

  // ── Milestone ───────────────────────────────────────────────────
  const [milestones, setMilestones] = useState([]);
  const [msStatus, setMsStatus] = useState("loading");
  const [msBusyId, setMsBusyId] = useState(null);
  const [msForm, setMsForm] = useState(emptyMsForm);
  const [showMsForm, setShowMsForm] = useState(false);
  const [msFormError, setMsFormError] = useState("");
  const [msSaving, setMsSaving] = useState(false);

  // ── Tanggal penting ─────────────────────────────────────────────
  const [impDates, setImpDates] = useState([]);
  const [idStatus, setIdStatus] = useState("loading");
  const [idBusyId, setIdBusyId] = useState(null);
  const [dateForm, setDateForm] = useState(emptyDateForm);
  const [showDateForm, setShowDateForm] = useState(false);
  const [dateFormError, setDateFormError] = useState("");
  const [dateSaving, setDateSaving] = useState(false);

  // ── Task (dari board Task, difilter project ini) ───────────────
  const [tasks, setTasks] = useState([]);
  const [tasksStatus, setTasksStatus] = useState("loading");
  const [taskBusyId, setTaskBusyId] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormError, setTaskFormError] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getB2bProject(id)
      .then((p) => {
        if (!alive) return;
        setProject(p);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[b2b] gagal memuat project:", err);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    let alive = true;
    listMilestones(id)
      .then((data) => {
        if (!alive) return;
        setMilestones(data);
        setMsStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[b2b] gagal memuat milestone:", err);
        setMsStatus("error");
      });
    listImportantDates(id)
      .then((data) => {
        if (!alive) return;
        setImpDates(data);
        setIdStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[b2b] gagal memuat tanggal penting:", err);
        setIdStatus("error");
      });
    listTasksByProject(id)
      .then((data) => {
        if (!alive) return;
        setTasks(data);
        setTasksStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[b2b] gagal memuat task:", err);
        setTasksStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const fetchMilestones = () =>
    listMilestones(id).then((data) => setMilestones(data));
  const fetchImportantDates = () =>
    listImportantDates(id).then((data) => setImpDates(data));

  const openInsert = async () => {
    setShowInsert(true);
    if (templates !== null) return;
    setLoadingTemplates(true);
    try {
      setTemplates(await listSyllabusTemplates());
    } catch (err) {
      console.error("[b2b] gagal memuat template silabus:", err);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleInsertTemplate = async (tpl) => {
    const merged = project.syllabus
      ? `${project.syllabus}\n\n---\n\n${tpl.content}`
      : tpl.content;
    setSyllabusSaving(true);
    try {
      const updated = await updateProjectSyllabus(project.id, merged);
      setProject(updated);
      setShowInsert(false);
      setMsg({ ok: true, text: `Silabus "${tpl.title}" di-insert.` });
    } catch (err) {
      window.alert(`Gagal insert: ${err?.message ?? err}`);
    } finally {
      setSyllabusSaving(false);
    }
  };

  const openEditSyllabus = () => {
    setSyllabusDraft(project.syllabus ?? "");
    setShowEditSyllabus(true);
  };

  const handleSaveSyllabus = async (e) => {
    e.preventDefault();
    setSyllabusSaving(true);
    try {
      const updated = await updateProjectSyllabus(project.id, syllabusDraft);
      setProject(updated);
      setShowEditSyllabus(false);
      setMsg({ ok: true, text: "Silabus tersimpan." });
    } catch (err) {
      window.alert(`Gagal menyimpan: ${err?.message ?? err}`);
    } finally {
      setSyllabusSaving(false);
    }
  };

  // ── Milestone handlers ──────────────────────────────────────────
  const openMsCreate = () => {
    setMsForm(emptyMsForm);
    setMsFormError("");
    setShowMsForm(true);
  };
  const openMsEdit = (m) => {
    setMsForm({
      id: m.id,
      title: m.title,
      target_date: m.target_date ?? "",
      done: m.done,
    });
    setMsFormError("");
    setShowMsForm(true);
  };

  const handleMsSave = async (e) => {
    e.preventDefault();
    setMsFormError("");
    if (!msForm.title.trim()) {
      setMsFormError("Judul wajib diisi.");
      return;
    }
    setMsSaving(true);
    try {
      if (msForm.id) {
        const updated = await updateMilestone(msForm.id, msForm);
        setMilestones((p) => p.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        await createMilestone(id, msForm);
        await fetchMilestones();
      }
      setShowMsForm(false);
    } catch (err) {
      setMsFormError(err?.message ?? "Gagal menyimpan.");
    } finally {
      setMsSaving(false);
    }
  };

  const handleMsToggle = async (m) => {
    setMsBusyId(m.id);
    setMilestones((p) =>
      p.map((x) => (x.id === m.id ? { ...x, done: !m.done } : x)),
    );
    try {
      await setMilestoneDone(m.id, !m.done);
    } catch (err) {
      setMilestones((p) =>
        p.map((x) => (x.id === m.id ? { ...x, done: m.done } : x)),
      );
      window.alert(`Gagal: ${err?.message ?? err}`);
    } finally {
      setMsBusyId(null);
    }
  };

  const handleMsDelete = async (m) => {
    if (!window.confirm(`Hapus milestone "${m.title}"?`)) return;
    setMsBusyId(m.id);
    try {
      await deleteMilestone(m.id);
      setMilestones((p) => p.filter((x) => x.id !== m.id));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setMsBusyId(null);
    }
  };

  // ── Tanggal penting handlers ─────────────────────────────────────
  const openDateCreate = () => {
    setDateForm(emptyDateForm);
    setDateFormError("");
    setShowDateForm(true);
  };
  const openDateEdit = (d) => {
    setDateForm({
      id: d.id,
      label: d.label,
      date_value: d.date_value ?? "",
      note: d.note ?? "",
    });
    setDateFormError("");
    setShowDateForm(true);
  };

  const handleDateSave = async (e) => {
    e.preventDefault();
    setDateFormError("");
    if (!dateForm.label.trim()) {
      setDateFormError("Label wajib diisi.");
      return;
    }
    if (!dateForm.date_value) {
      setDateFormError("Tanggal wajib diisi.");
      return;
    }
    setDateSaving(true);
    try {
      if (dateForm.id) {
        const updated = await updateImportantDate(dateForm.id, dateForm);
        setImpDates((p) => p.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        await createImportantDate(id, dateForm);
        await fetchImportantDates();
      }
      setShowDateForm(false);
    } catch (err) {
      setDateFormError(err?.message ?? "Gagal menyimpan.");
    } finally {
      setDateSaving(false);
    }
  };

  const handleDateDelete = async (d) => {
    if (!window.confirm(`Hapus tanggal "${d.label}"?`)) return;
    setIdBusyId(d.id);
    try {
      await deleteImportantDate(d.id);
      setImpDates((p) => p.filter((x) => x.id !== d.id));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setIdBusyId(null);
    }
  };

  // ── Task handlers ────────────────────────────────────────────────
  const openTaskCreate = () => {
    setTaskForm(emptyTaskForm);
    setTaskFormError("");
    setShowTaskForm(true);
  };
  const openTaskEdit = (t) => {
    setTaskForm({
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      priority: t.priority,
      status: t.status,
      deadline: t.deadline ?? "",
    });
    setTaskFormError("");
    setShowTaskForm(true);
  };

  const handleTaskSave = async (e) => {
    e.preventDefault();
    setTaskFormError("");
    if (!taskForm.title.trim()) {
      setTaskFormError("Judul wajib diisi.");
      return;
    }
    const payload = { ...taskForm, project_id: id };
    setTaskSaving(true);
    try {
      if (taskForm.id) {
        const updated = await updateTask(taskForm.id, payload);
        setTasks((p) => p.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await createTask(payload);
        setTasks((p) => [...p, created]);
      }
      setShowTaskForm(false);
    } catch (err) {
      setTaskFormError(err?.message ?? "Gagal menyimpan.");
    } finally {
      setTaskSaving(false);
    }
  };

  const handleTaskDelete = async (t) => {
    if (!window.confirm(`Hapus task "${t.title}"?`)) return;
    setTaskBusyId(t.id);
    try {
      await deleteTask(t.id);
      setTasks((p) => p.filter((x) => x.id !== t.id));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setTaskBusyId(null);
    }
  };

  const handleTaskStatusChange = async (t, next) => {
    if (next === t.status) return;
    setTaskBusyId(t.id);
    const prevStatus = t.status;
    setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    try {
      await setTaskStatus(t.id, next);
    } catch (err) {
      setTasks((p) =>
        p.map((x) => (x.id === t.id ? { ...x, status: prevStatus } : x)),
      );
      window.alert(`Gagal ganti status: ${err?.message ?? err}`);
    } finally {
      setTaskBusyId(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="mx-auto flex max-w-[760px] flex-col gap-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (status === "error" || !project) {
    return (
      <div className="mx-auto flex max-w-[760px] flex-col gap-4">
        <Link
          to="/b2b"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
        >
          <ArrowLeft size={14} /> B2B Center
        </Link>
        <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-12 text-center text-sm text-rose-500">
          Gagal memuat project.
        </p>
      </div>
    );
  }

  const sm = STATUS_META[project.status] ?? STATUS_META.berjalan;

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6">
      <div>
        <Link
          to="/b2b"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
        >
          <ArrowLeft size={14} /> B2B Center
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            {project.client_name || "Tanpa nama"}
          </h1>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${sm.cls}`}
          >
            {sm.label}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          {project.package && <span>{project.package}</span>}
          {project.category && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
              {project.category}
            </span>
          )}
          {project.start_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={11} />
              {shortDate(project.start_date)}
            </span>
          )}
        </div>
        {project.note && (
          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600">
            {project.note}
          </p>
        )}
      </div>

      {msg && (
        <p
          className={`text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}
        >
          {msg.text}
        </p>
      )}

      {/* ── Milestone ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold tracking-tight text-zinc-900">
            Milestone
          </h2>
          {isAdmin && (
            <button
              onClick={openMsCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <Plus size={13} strokeWidth={2.6} /> Tambah milestone
            </button>
          )}
        </div>
        {msStatus === "loading" ? (
          <Skeleton className="h-14 w-full rounded-xl" />
        ) : msStatus === "error" ? (
          <p className="rounded-xl border border-dashed border-rose-300 bg-white px-4 py-6 text-center text-xs text-rose-500">
            Gagal memuat milestone.
          </p>
        ) : milestones.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-xs text-zinc-400">
            Belum ada milestone.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white">
            {milestones.map((m) => (
              <div key={m.id} className="group flex items-center gap-3 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => isAdmin && handleMsToggle(m)}
                  disabled={!isAdmin || msBusyId === m.id}
                  aria-label={m.done ? "Tandai belum tercapai" : "Tandai tercapai"}
                  className="shrink-0 disabled:cursor-default"
                >
                  {m.done ? (
                    <CheckCircle2 size={18} className="text-teal-500" />
                  ) : (
                    <Circle size={18} className="text-zinc-300" />
                  )}
                </button>
                <p
                  className={`min-w-0 flex-1 truncate text-sm ${
                    m.done ? "text-zinc-400 line-through" : "font-medium text-zinc-800"
                  }`}
                >
                  {m.title}
                </p>
                {m.target_date && (
                  <span className="shrink-0 text-xs text-zinc-400">
                    {shortDate(m.target_date)}
                  </span>
                )}
                {isAdmin && (
                  <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openMsEdit(m)}
                      aria-label="Ubah"
                      className={rowActionBtn}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleMsDelete(m)}
                      disabled={msBusyId === m.id}
                      aria-label="Hapus"
                      className={rowDeleteBtn}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tanggal penting ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold tracking-tight text-zinc-900">
            Tanggal penting
          </h2>
          {isAdmin && (
            <button
              onClick={openDateCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <Plus size={13} strokeWidth={2.6} /> Tambah tanggal
            </button>
          )}
        </div>
        {idStatus === "loading" ? (
          <Skeleton className="h-14 w-full rounded-xl" />
        ) : idStatus === "error" ? (
          <p className="rounded-xl border border-dashed border-rose-300 bg-white px-4 py-6 text-center text-xs text-rose-500">
            Gagal memuat tanggal penting.
          </p>
        ) : impDates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-xs text-zinc-400">
            Belum ada tanggal penting.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white">
            {impDates.map((d) => (
              <div key={d.id} className="group flex items-center gap-3 px-4 py-2.5">
                <span className="shrink-0 rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                  {shortDate(d.date_value)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800">
                    {d.label}
                  </p>
                  {d.note && (
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {d.note}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openDateEdit(d)}
                      aria-label="Ubah"
                      className={rowActionBtn}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDateDelete(d)}
                      disabled={idBusyId === d.id}
                      aria-label="Hapus"
                      className={rowDeleteBtn}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Task ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold tracking-tight text-zinc-900">
            Task
          </h2>
          {isAdmin && (
            <button
              onClick={openTaskCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <Plus size={13} strokeWidth={2.6} /> Tambah task
            </button>
          )}
        </div>
        {tasksStatus === "loading" ? (
          <Skeleton className="h-14 w-full rounded-xl" />
        ) : tasksStatus === "error" ? (
          <p className="rounded-xl border border-dashed border-rose-300 bg-white px-4 py-6 text-center text-xs text-rose-500">
            Gagal memuat task.
          </p>
        ) : tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-xs text-zinc-400">
            Belum ada task terkait project ini.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white">
            {tasks.map((t) => (
              <div key={t.id} className="group flex items-center gap-2 px-4 py-2.5">
                <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                  {t.priority}
                </span>
                <p
                  className={`min-w-0 flex-1 truncate text-sm ${
                    t.status === "done"
                      ? "text-zinc-400 line-through"
                      : "font-medium text-zinc-800"
                  }`}
                >
                  {t.title}
                </p>
                {t.deadline && (
                  <span className="shrink-0 text-xs text-zinc-400">
                    {shortDate(t.deadline)}
                  </span>
                )}
                <select
                  value={t.status}
                  disabled={taskBusyId === t.id}
                  onChange={(e) => handleTaskStatusChange(t, e.target.value)}
                  className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 outline-none transition-colors focus:border-brand-500 disabled:opacity-50"
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {isAdmin && (
                  <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openTaskEdit(t)}
                      aria-label="Ubah"
                      className={rowActionBtn}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleTaskDelete(t)}
                      disabled={taskBusyId === t.id}
                      aria-label="Hapus"
                      className={rowDeleteBtn}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <Link
          to={`/task?project=${id}`}
          className="self-start text-xs font-medium text-brand-600 underline underline-offset-2"
        >
          Lihat di board Task →
        </Link>
      </div>

      {/* ── Silabus ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold tracking-tight text-zinc-900">
          Silabus
        </h2>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={openInsert}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <ClipboardCopy size={14} /> Insert dari silabus
            </button>
            <button
              onClick={openEditSyllabus}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <Pencil size={14} /> Edit
            </button>
          </div>
        )}
      </div>

      {project.syllabus ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4">
          <Markdown text={project.syllabus} />
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada silabus
          {isAdmin ? ". Insert dari template atau tulis manual." : "."}
        </p>
      )}

      {/* Milestone: tambah / edit */}
      <Modal
        open={showMsForm}
        onClose={() => setShowMsForm(false)}
        title={msForm.id ? "Ubah milestone" : "Milestone baru"}
      >
        <form onSubmit={handleMsSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Judul
            <input
              value={msForm.title}
              onChange={(e) =>
                setMsForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="mis. Kickoff pelatihan"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Target tanggal
            <input
              type="date"
              value={msForm.target_date}
              onChange={(e) =>
                setMsForm((f) => ({ ...f, target_date: e.target.value }))
              }
              className={fieldCls}
            />
          </label>

          {msFormError && <p className="text-xs text-rose-600">{msFormError}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={msSaving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {msSaving ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              onClick={() => setShowMsForm(false)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>

      {/* Tanggal penting: tambah / edit */}
      <Modal
        open={showDateForm}
        onClose={() => setShowDateForm(false)}
        title={dateForm.id ? "Ubah tanggal" : "Tanggal penting baru"}
      >
        <form onSubmit={handleDateSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Label
            <input
              value={dateForm.label}
              onChange={(e) =>
                setDateForm((f) => ({ ...f, label: e.target.value }))
              }
              placeholder="mis. Deadline pembayaran"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Tanggal
            <input
              type="date"
              value={dateForm.date_value}
              onChange={(e) =>
                setDateForm((f) => ({ ...f, date_value: e.target.value }))
              }
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Catatan
            <textarea
              value={dateForm.note}
              onChange={(e) =>
                setDateForm((f) => ({ ...f, note: e.target.value }))
              }
              rows={2}
              className={fieldCls}
            />
          </label>

          {dateFormError && (
            <p className="text-xs text-rose-600">{dateFormError}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={dateSaving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {dateSaving ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              onClick={() => setShowDateForm(false)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>

      {/* Task: tambah / edit */}
      <Modal
        open={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        title={taskForm.id ? "Ubah task" : "Task baru"}
      >
        <form onSubmit={handleTaskSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Judul
            <input
              value={taskForm.title}
              onChange={(e) =>
                setTaskForm((f) => ({ ...f, title: e.target.value }))
              }
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Deskripsi
            <textarea
              value={taskForm.description}
              onChange={(e) =>
                setTaskForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              className={fieldCls}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-medium text-zinc-600">
              Prioritas
              <select
                value={taskForm.priority}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, priority: e.target.value }))
                }
                className={fieldCls}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Status
              <select
                value={taskForm.status}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, status: e.target.value }))
                }
                className={fieldCls}
              >
                {TASK_STATUSES.map((s) => (
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
                value={taskForm.deadline}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, deadline: e.target.value }))
                }
                className={fieldCls}
              />
            </label>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Task ini kekait ke project {project.client_name || "ini"}. Atur
            assignee per subtask di board{" "}
            <Link to="/task" className="font-semibold underline">
              Task
            </Link>
            .
          </p>

          {taskFormError && (
            <p className="text-xs text-rose-600">{taskFormError}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={taskSaving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {taskSaving ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              onClick={() => setShowTaskForm(false)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>

      {/* Insert dari template */}
      <Modal
        open={showInsert}
        onClose={() => setShowInsert(false)}
        title="Insert dari silabus"
      >
        <div className="flex flex-col gap-2">
          {loadingTemplates ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : !templates || templates.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Belum ada template. Bikin dulu di{" "}
              <Link
                to="/b2b?tab=silabus"
                className="font-semibold text-brand-600 underline"
              >
                B2B Center → Silabus
              </Link>
              .
            </p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleInsertTemplate(t)}
                disabled={syllabusSaving}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
              >
                {t.title || "Tanpa judul"}
              </button>
            ))
          )}
          {project.syllabus && (templates?.length ?? 0) > 0 && (
            <p className="text-[11px] text-zinc-400">
              Silabus yang ada sekarang nggak diganti — isi template
              ditambahin ke bawahnya.
            </p>
          )}
        </div>
      </Modal>

      {/* Edit silabus */}
      <Modal
        open={showEditSyllabus}
        onClose={() => setShowEditSyllabus(false)}
        title="Edit silabus"
      >
        <form onSubmit={handleSaveSyllabus} className="flex flex-col gap-3">
          <textarea
            value={syllabusDraft}
            onChange={(e) => setSyllabusDraft(e.target.value)}
            rows={14}
            placeholder={"## Bab 1 — Fungsi\n- Fungsi Linear\n- Fungsi Kuadrat"}
            className="scroll-slim w-full rounded-lg border border-zinc-300 p-3 font-mono text-xs text-zinc-900 outline-none transition-colors focus:border-brand-500"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={syllabusSaving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {syllabusSaving ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              onClick={() => setShowEditSyllabus(false)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

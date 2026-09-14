import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import { useAuth } from "../context/auth-context";
import { shortDate } from "../lib/date";
import {
  getB2bProject,
  listB2bSyllabus,
  createSyllabusItem,
  updateSyllabusItem,
  deleteSyllabusItem,
  swapSyllabusPosition,
  setSyllabusDone,
} from "../lib/b2b";

const STATUS_META = {
  berjalan: { label: "Berjalan", cls: "bg-sky-100 text-sky-700" },
  selesai: { label: "Selesai", cls: "bg-teal-100 text-teal-700" },
  batal: { label: "Batal", cls: "bg-zinc-100 text-zinc-500" },
};

const emptyItem = { id: null, topic: "", detail: "" };
const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";

export default function B2bProjectPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [msg, setMsg] = useState(null); // { ok, text }
  const [rowBusyId, setRowBusyId] = useState(null);

  const [form, setForm] = useState(emptyItem);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([getB2bProject(id), listB2bSyllabus(id)])
      .then(([p, s]) => {
        if (!alive) return;
        setProject(p);
        setItems(s);
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

  const doneCount = useMemo(() => items.filter((i) => i.done).length, [items]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm(emptyItem);
    setFormError("");
    setShowForm(true);
  };
  const openEdit = (it) => {
    setForm({ id: it.id, topic: it.topic, detail: it.detail });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.topic.trim()) {
      setFormError("Topik wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        const updated = await updateSyllabusItem(form.id, form);
        setItems((p) => p.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await createSyllabusItem(id, form, items.length);
        setItems((p) => [...p, created]);
      }
      setShowForm(false);
      setMsg({ ok: true, text: "Tersimpan." });
    } catch (err) {
      setFormError(err?.message ?? "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (it) => {
    if (!window.confirm(`Hapus topik "${it.topic}"?`)) return;
    setRowBusyId(it.id);
    try {
      await deleteSyllabusItem(it.id);
      setItems((p) => p.filter((x) => x.id !== it.id));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
    }
  };

  const handleToggleDone = async (it, done) => {
    setItems((p) => p.map((x) => (x.id === it.id ? { ...x, done } : x)));
    try {
      await setSyllabusDone(it.id, done);
    } catch (err) {
      setItems((p) =>
        p.map((x) => (x.id === it.id ? { ...x, done: !done } : x))
      );
      window.alert(`Gagal: ${err?.message ?? err}`);
    }
  };

  const handleMove = async (it, dir) => {
    const idx = items.findIndex((x) => x.id === it.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const other = items[swapIdx];
    setRowBusyId(it.id);
    try {
      const [ra, rb] = await swapSyllabusPosition(it, other);
      setItems((p) =>
        p
          .map((x) => {
            if (x.id === ra.id) return ra;
            if (x.id === rb.id) return rb;
            return x;
          })
          .sort((a, b) => a.position - b.position)
      );
    } catch (err) {
      window.alert(`Gagal ubah urutan: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
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

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-zinc-900">
            Silabus
          </h2>
          {items.length > 0 && (
            <p className="mt-0.5 text-xs text-zinc-400">
              {doneCount}/{items.length} selesai
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Plus size={14} strokeWidth={2.6} /> Tambah topik
          </button>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? "Ubah topik" : "Topik baru"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Topik
            <input
              value={form.topic}
              onChange={(e) => set("topic", e.target.value)}
              placeholder="mis. Fungsi Kuadrat"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Catatan (opsional)
            <textarea
              value={form.detail}
              onChange={(e) => set("detail", e.target.value)}
              rows={3}
              placeholder="Materi, target, atau catatan lain…"
              className={fieldCls}
            />
          </label>

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

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada silabus{isAdmin ? ". Tambah topik pertama." : "."}
        </p>
      ) : (
        <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
          {items.map((it, idx) => (
            <div key={it.id} className="group flex items-start gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={it.done}
                onChange={(e) => handleToggleDone(it, e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
                aria-label="Tandai selesai"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium leading-snug ${
                    it.done ? "text-zinc-400 line-through" : "text-zinc-900"
                  }`}
                >
                  {it.topic}
                </p>
                {it.detail && (
                  <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-zinc-500">
                    {it.detail}
                  </p>
                )}
              </div>
              {isAdmin && (
                <span className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    onClick={() => handleMove(it, -1)}
                    disabled={idx === 0 || rowBusyId === it.id}
                    aria-label="Naikkan"
                    className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    onClick={() => handleMove(it, 1)}
                    disabled={idx === items.length - 1 || rowBusyId === it.id}
                    aria-label="Turunkan"
                    className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    onClick={() => openEdit(it)}
                    aria-label="Ubah"
                    className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(it)}
                    disabled={rowBusyId === it.id}
                    aria-label="Hapus"
                    className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
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
  );
}

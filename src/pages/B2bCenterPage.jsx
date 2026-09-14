import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import { useAuth } from "../context/auth-context";
import { shortDate } from "../lib/date";
import {
  listB2bProjects,
  createB2bProject,
  updateB2bProject,
  deleteB2bProject,
} from "../lib/b2b";

const STATUSES = [
  { value: "berjalan", label: "Berjalan", cls: "bg-sky-100 text-sky-700" },
  { value: "selesai", label: "Selesai", cls: "bg-teal-100 text-teal-700" },
  { value: "batal", label: "Batal", cls: "bg-zinc-100 text-zinc-500" },
];
const statusMeta = (v) => STATUSES.find((s) => s.value === v) ?? STATUSES[0];

const emptyForm = {
  id: null,
  client_name: "",
  package: "",
  status: "berjalan",
  start_date: "",
  note: "",
};
const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";

export default function B2bCenterPage() {
  const { isAdmin } = useAuth();

  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [msg, setMsg] = useState(null); // { ok, text }
  const [rowBusyId, setRowBusyId] = useState(null);
  const [q, setQ] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchRows() {
    try {
      const data = await listB2bProjects();
      setRows(data);
      setStatus("ready");
    } catch (err) {
      console.error("[b2b] gagal memuat:", err);
      setStatus("error");
    }
  }

  useEffect(() => {
    let alive = true;
    listB2bProjects()
      .then((data) => {
        if (!alive) return;
        setRows(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[b2b] gagal memuat:", err);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.client_name.toLowerCase().includes(needle) ||
        r.package.toLowerCase().includes(needle) ||
        r.note.toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };
  const openEdit = (r, e) => {
    e.preventDefault();
    e.stopPropagation();
    setForm({
      id: r.id,
      client_name: r.client_name,
      package: r.package,
      status: r.status,
      start_date: r.start_date ?? "",
      note: r.note,
    });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.client_name.trim()) {
      setFormError("Nama klien wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        const updated = await updateB2bProject(form.id, form);
        setRows((p) => p.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        await createB2bProject(form, null);
        await fetchRows();
      }
      setShowForm(false);
      setMsg({ ok: true, text: "Tersimpan." });
    } catch (err) {
      setFormError(err?.message ?? "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Hapus project "${r.client_name}"? Silabusnya ikut hilang.`))
      return;
    setRowBusyId(r.id);
    try {
      await deleteB2bProject(r.id);
      setRows((p) => p.filter((x) => x.id !== r.id));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            B2B Center
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Project B2B — klien, paket yang deal, dan silabusnya.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Plus size={14} strokeWidth={2.6} /> Tambah project
          </button>
        )}
      </div>

      {msg && (
        <p
          className={`text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}
        >
          {msg.text}
        </p>
      )}

      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari klien / paket…"
          className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white sm:max-w-xs"
        />
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? "Ubah project" : "Project B2B baru"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Nama klien
            <input
              value={form.client_name}
              onChange={(e) => set("client_name", e.target.value)}
              placeholder="mis. SMA Harapan Bangsa"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Paket yang deal
            <input
              value={form.package}
              onChange={(e) => set("package", e.target.value)}
              placeholder="mis. Paket Intensif 20 sesi"
              className={fieldCls}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
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
              Mulai
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                className={fieldCls}
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-zinc-600">
            Catatan
            <textarea
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              rows={3}
              placeholder="PIC, kontak, konteks deal…"
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

      {status === "loading" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : status === "error" ? (
        <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-12 text-center text-sm text-rose-500">
          Gagal memuat data.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada project B2B{isAdmin ? ". Tambah satu." : "."}
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Nggak ada yang cocok.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => {
            const sm = statusMeta(r.status);
            return (
              <Link
                key={r.id}
                to={`/b2b/${r.id}`}
                className="group flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug text-zinc-900">
                    {r.client_name || "Tanpa nama"}
                  </p>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${sm.cls}`}
                  >
                    {sm.label}
                  </span>
                </div>
                {r.package && (
                  <p className="mt-1 text-xs font-medium text-zinc-600">
                    {r.package}
                  </p>
                )}
                {r.note && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                    {r.note}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
                  {r.start_date && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={11} />
                      {shortDate(r.start_date)}
                    </span>
                  )}
                  {isAdmin && (
                    <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => openEdit(r, e)}
                        aria-label="Ubah"
                        className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(r, e)}
                        disabled={rowBusyId === r.id}
                        aria-label="Hapus"
                        className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

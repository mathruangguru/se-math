import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import Markdown from "../components/ui/Markdown";
import { useAuth } from "../context/auth-context";
import {
  listSyllabusTemplates,
  createSyllabusTemplate,
  updateSyllabusTemplate,
  deleteSyllabusTemplate,
} from "../lib/syllabus";

const emptyForm = { id: null, title: "", content: "" };
const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";

export default function SyllabusLibraryPage() {
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

  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    let alive = true;
    listSyllabusTemplates()
      .then((data) => {
        if (!alive) return;
        setRows(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[silabus] gagal memuat:", err);
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
        r.title.toLowerCase().includes(needle) ||
        r.content.toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };
  const openEdit = (r, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setForm({ id: r.id, title: r.title, content: r.content });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.title.trim()) {
      setFormError("Judul wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        const updated = await updateSyllabusTemplate(form.id, form);
        setRows((p) => p.map((r) => (r.id === updated.id ? updated : r)));
        setDetailItem((d) => (d?.id === updated.id ? updated : d));
      } else {
        const created = await createSyllabusTemplate(form, null);
        setRows((p) => [created, ...p]);
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
    e?.preventDefault();
    e?.stopPropagation();
    if (!window.confirm(`Hapus silabus "${r.title}"?`)) return;
    setRowBusyId(r.id);
    try {
      await deleteSyllabusTemplate(r.id);
      setRows((p) => p.filter((x) => x.id !== r.id));
      setDetailItem((d) => (d?.id === r.id ? null : d));
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
            Silabus
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Template silabus (markdown) — dibikin di sini duluan, nanti
            tinggal di-insert ke project di B2B Center.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Plus size={14} strokeWidth={2.6} /> Tambah silabus
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
          placeholder="Cari judul / isi…"
          className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white sm:max-w-xs"
        />
      </div>

      {/* Form tambah / edit */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? "Ubah silabus" : "Silabus baru"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Judul
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="mis. Silabus Kelas 10 Semester 1"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Isi (markdown)
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              rows={12}
              placeholder={"## Bab 1 — Fungsi\n- Fungsi Linear\n- Fungsi Kuadrat\n\n## Bab 2 — Trigonometri\n- Sudut & Radian"}
              className={`${fieldCls} scroll-slim font-mono text-xs`}
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

      {/* Detail modal */}
      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem?.title}
      >
        {detailItem && (
          <div className="flex flex-col gap-3">
            {detailItem.content ? (
              <div className="scroll-slim max-h-[55vh] overflow-y-auto">
                <Markdown text={detailItem.content} />
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Belum ada isi.</p>
            )}
            {isAdmin && (
              <div className="flex items-center gap-2 border-t border-zinc-100 pt-3">
                <button
                  onClick={(e) => openEdit(detailItem, e)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <Pencil size={13} /> Ubah
                </button>
                <button
                  onClick={(e) => handleDelete(detailItem, e)}
                  disabled={rowBusyId === detailItem.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                >
                  <Trash2 size={13} /> Hapus
                </button>
                <button
                  onClick={() => setDetailItem(null)}
                  className="ml-auto rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        )}
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
          Belum ada silabus{isAdmin ? ". Tambah satu." : "."}
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Nggak ada yang cocok.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetailItem(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDetailItem(r);
                }
              }}
              className="group flex cursor-pointer flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 text-left transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-snug text-zinc-900">
                  {r.title || "Tanpa judul"}
                </p>
                {isAdmin && (
                  <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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
              {r.content && (
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-zinc-500">
                  {r.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

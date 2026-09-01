import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import Skeleton from "../../components/ui/Skeleton";
import Pagination from "../../components/ui/Pagination";
import Modal from "../../components/ui/Modal";
import { listLinks, createLink, updateLink, deleteLink } from "../../lib/links";

const emptyForm = { id: null, title: "", url: "", description: "", category: "" };
const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";
const PER_PAGE = 50;

export default function LinkAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [page, setPage] = useState(1);
  const [rowBusyId, setRowBusyId] = useState(null);
  const [msg, setMsg] = useState(null); // { ok, text }

  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchRows() {
    try {
      const data = await listLinks();
      setRows(data);
      setStatus("ready");
    } catch (err) {
      console.error("[admin/link] gagal memuat:", err);
      setStatus("error");
    }
  }

  useEffect(() => {
    let alive = true;
    listLinks()
      .then((data) => {
        if (!alive) return;
        setRows(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[admin/link] gagal memuat:", err);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => {
    const s = new Set();
    for (const r of rows) {
      const c = (r.category ?? "").trim();
      if (c) s.add(c);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (cat && (r.category ?? "").trim() !== cat) return false;
      if (!needle) return true;
      return (
        r.title.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle) ||
        r.category.toLowerCase().includes(needle) ||
        r.url.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, cat]);

  // Balik ke halaman 1 tiap filter berubah (adjust state saat render).
  const filterKey = `${q} ${cat}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PER_PAGE;
  const shown = filtered.slice(start, start + PER_PAGE);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };
  const openEdit = (row) => {
    setForm({ ...row });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    const title = form.title.trim();
    const url = form.url.trim();
    if (!title) {
      setFormError("Judul wajib diisi.");
      return;
    }
    if (!url) {
      setFormError("URL wajib diisi.");
      return;
    }
    const payload = {
      title,
      url,
      description: form.description.trim(),
      category: form.category.trim(),
    };
    setSaving(true);
    try {
      if (form.id) {
        const updated = await updateLink(form.id, payload);
        setRows((prev) =>
          prev.map((r) => (r.id === form.id ? { ...r, ...updated } : r))
        );
      } else {
        await createLink(payload);
        await fetchRows();
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

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus "${row.title || row.url}"?`)) return;
    setRowBusyId(row.id);
    try {
      await deleteLink(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      {/* Header */}
      <div>
        <Link
          to="/link"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
        >
          <ArrowLeft size={14} /> Link
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-zinc-900">
          Kelola Link
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Tambah, ubah, atau hapus tautan yang tampil di menu Link.
        </p>
      </div>

      {msg && (
        <p className={`text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>
          {msg.text}
        </p>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari…"
          className="h-10 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white sm:max-w-xs"
        />
        {categories.length > 0 && (
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none transition-colors focus:border-brand-500 focus:bg-white sm:max-w-[220px]"
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
        >
          <Plus size={14} strokeWidth={2.6} /> Tambah link
        </button>
      </div>

      {/* Form tambah / edit — modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? "Ubah link" : "Link baru"}
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
            URL
            <input
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://…"
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
          <label className="block text-xs font-medium text-zinc-600">
            Kategori / grup
            <input
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              list="se-link-categories"
              placeholder="mis. Kurikulum, Rapor, Template"
              className={fieldCls}
            />
            <datalist id="se-link-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
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

      {/* Tabel */}
      {status === "loading" ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : status === "error" ? (
        <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-12 text-center text-sm text-rose-500">
          Gagal memuat data.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada link. Tambah satu.
        </p>
      ) : (
        <>
          <p className="text-xs text-zinc-400">
            {filtered.length === 0
              ? "0"
              : `${(start + 1).toLocaleString("id")}–${(
                  start + shown.length
                ).toLocaleString("id")}`}{" "}
            dari {filtered.length.toLocaleString("id")}
            {filtered.length !== rows.length
              ? ` (total ${rows.length.toLocaleString("id")})`
              : ""}{" "}
            link
          </p>
          <div className="scroll-slim overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Judul</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-zinc-100 align-top transition-colors hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-zinc-900">
                        {r.title || "—"}
                      </p>
                      {r.description && (
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {r.description}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                      {r.category || "—"}
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
                      >
                        <span className="truncate">{r.url}</span>
                        <ExternalLink size={13} className="shrink-0" />
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(r)}
                        className="mr-1 inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                        aria-label="Ubah"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={rowBusyId === r.id}
                        className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        aria-label="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
        </>
      )}
    </div>
  );
}

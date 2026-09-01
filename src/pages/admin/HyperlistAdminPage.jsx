import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Trash2, Upload } from "lucide-react";
import Skeleton from "../../components/ui/Skeleton";
import {
  listHyperlist,
  createHyperlistEntry,
  updateHyperlistEntry,
  deleteHyperlistEntry,
  bulkCreateHyperlist,
  parseHyperlistTsv,
} from "../../lib/hyperlist";

const emptyForm = { id: null, kode: "", topik: "", subtopik: "", link: "" };
const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";

export default function HyperlistAdminPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [q, setQ] = useState("");
  const [rowBusyId, setRowBusyId] = useState(null);
  const [msg, setMsg] = useState(null); // { ok, text }

  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState(null); // number | null
  const [replaceAll, setReplaceAll] = useState(false);
  const [importing, setImporting] = useState(false);

  async function fetchRows() {
    try {
      const data = await listHyperlist();
      setRows(data);
      setStatus("ready");
    } catch (err) {
      console.error("[admin/hyperlist] gagal memuat:", err);
      setStatus("error");
    }
  }

  useEffect(() => {
    let alive = true;
    listHyperlist()
      .then((data) => {
        if (!alive) return;
        setRows(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[admin/hyperlist] gagal memuat:", err);
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
        r.kode.toLowerCase().includes(needle) ||
        r.topik.toLowerCase().includes(needle) ||
        r.subtopik.toLowerCase().includes(needle)
    );
  }, [rows, q]);

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
    const subtopik = form.subtopik.trim();
    if (!subtopik) {
      setFormError("Subtopik wajib diisi.");
      return;
    }
    const payload = {
      kode: form.kode.trim(),
      topik: form.topik.trim(),
      subtopik,
      link: form.link.trim(),
    };
    setSaving(true);
    try {
      if (form.id) {
        const updated = await updateHyperlistEntry(form.id, payload);
        setRows((prev) =>
          prev.map((r) => (r.id === form.id ? { ...r, ...updated } : r))
        );
      } else {
        await createHyperlistEntry(payload);
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
    if (!window.confirm(`Hapus "${row.subtopik || row.kode}"?`)) return;
    setRowBusyId(row.id);
    try {
      await deleteHyperlistEntry(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
    }
  };

  const handleCheckImport = () => {
    try {
      setImportPreview(parseHyperlistTsv(importText).length);
    } catch {
      setImportPreview(0);
    }
  };

  const handleImport = async () => {
    const parsed = parseHyperlistTsv(importText);
    if (parsed.length === 0) {
      setMsg({ ok: false, text: "Nggak ada baris valid untuk diimpor." });
      return;
    }
    if (
      replaceAll &&
      !window.confirm(
        `Ganti SEMUA isi tabel dengan ${parsed.length} baris ini? Data lama hilang.`
      )
    ) {
      return;
    }
    setImporting(true);
    setMsg(null);
    try {
      const n = await bulkCreateHyperlist(parsed, { replaceAll });
      await fetchRows();
      setImportText("");
      setImportPreview(null);
      setShowImport(false);
      setMsg({ ok: true, text: `${n} baris diimpor.` });
    } catch (err) {
      setMsg({ ok: false, text: err?.message ?? "Gagal impor." });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      {/* Header */}
      <div>
        <Link
          to="/hyperlist"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
        >
          <ArrowLeft size={14} /> Hyperlist
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-zinc-900">
          Kelola Hyperlist
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Tambah, ubah, hapus, atau impor materi PDF LMS.
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
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari…"
          className="h-10 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white sm:max-w-xs"
        />
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
        >
          <Plus size={14} strokeWidth={2.6} /> Tambah materi
        </button>
        <button
          onClick={() => setShowImport((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <Upload size={14} /> Impor massal
        </button>
      </div>

      {/* Form tambah / edit */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-5"
        >
          <p className="text-sm font-bold tracking-tight text-zinc-900">
            {form.id ? "Ubah materi" : "Materi baru"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Kode
              <input
                value={form.kode}
                onChange={(e) => set("kode", e.target.value)}
                className={fieldCls}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Topik
              <input
                value={form.topik}
                onChange={(e) => set("topik", e.target.value)}
                className={fieldCls}
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-zinc-600">
            Subtopik
            <input
              value={form.subtopik}
              onChange={(e) => set("subtopik", e.target.value)}
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Link PDF
            <input
              value={form.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="https://drive.google.com/…"
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
      )}

      {/* Impor massal */}
      {showImport && (
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-5">
          <p className="text-sm font-bold tracking-tight text-zinc-900">
            Impor massal
          </p>
          <p className="text-xs text-zinc-500">
            Tempel data dipisah tab: <code>KODE ⇥ TOPIK ⇥ SUBTOPIK ⇥ LINK</code>{" "}
            (satu baris per materi). Baris header otomatis diabaikan.
          </p>
          <textarea
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportPreview(null);
            }}
            rows={8}
            className="scroll-slim w-full rounded-lg border border-zinc-300 p-3 font-mono text-xs text-zinc-900 outline-none transition-colors focus:border-brand-500"
            placeholder={"11KMERMAT3001BS_V1\tFungsi Komposisi…\tFungsi\thttps://…"}
          />
          <label className="flex items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={replaceAll}
              onChange={(e) => setReplaceAll(e.target.checked)}
            />
            Ganti semua isi tabel (hapus data lama dulu)
          </label>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCheckImport}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cek
            </button>
            {importPreview != null && (
              <span className="text-xs text-zinc-500">
                {importPreview.toLocaleString("id")} baris terbaca
              </span>
            )}
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || !importText.trim()}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {importing ? "Mengimpor…" : "Impor"}
            </button>
          </div>
        </div>
      )}

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
          Belum ada materi. Tambah satu, atau impor massal.
        </p>
      ) : (
        <>
          <p className="text-xs text-zinc-400">
            {filtered.length.toLocaleString("id")} dari{" "}
            {rows.length.toLocaleString("id")} materi
          </p>
          <div className="scroll-slim overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Topik</th>
                  <th className="px-4 py-3">Subtopik</th>
                  <th className="px-4 py-3">Link</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 800).map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-zinc-100 align-top transition-colors hover:bg-zinc-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-500">
                      {r.kode}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {r.topik}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      {r.subtopik}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-xs text-zinc-400">
                      {r.link}
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
          {filtered.length > 800 && (
            <p className="text-xs text-zinc-400">
              Menampilkan 800 teratas — persempit pencarian.
            </p>
          )}
        </>
      )}
    </div>
  );
}

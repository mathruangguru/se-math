import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import { useAuth } from "../context/auth-context";
import {
  listPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
} from "../lib/prompts";

const emptyForm = {
  id: null,
  title: "",
  tool: "",
  category: "",
  prompt: "",
  note: "",
};
const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";
const filterCls =
  "h-9 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none transition-colors focus:border-brand-500 focus:bg-white";

function Chips({ p }) {
  if (!p.tool && !p.category) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {p.tool && (
        <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">
          {p.tool}
        </span>
      )}
      {p.category && (
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
          {p.category}
        </span>
      )}
    </div>
  );
}

export default function PromptBankPage() {
  const { profile, isAdmin } = useAuth();
  const myId = profile?.id ?? null;

  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [msg, setMsg] = useState(null); // { ok, text }
  const [rowBusyId, setRowBusyId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    let alive = true;
    listPrompts()
      .then((r) => {
        if (!alive) return;
        setRows(r);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[prompt] gagal memuat:", err);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(
    () =>
      [...new Set(rows.map((r) => r.category).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "id")
      ),
    [rows]
  );
  // Filter kategori yang kategorinya udah nggak ada (habis diedit/dihapus)
  // jatuh balik ke "semua".
  const activeCat = categories.includes(cat) ? cat : "";

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeCat && r.category !== activeCat) return false;
      if (!needle) return true;
      return (
        r.title.toLowerCase().includes(needle) ||
        r.prompt.toLowerCase().includes(needle) ||
        r.category.toLowerCase().includes(needle) ||
        r.tool.toLowerCase().includes(needle) ||
        r.note.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, activeCat]);

  const canDelete = (r) => isAdmin || (myId && r.created_by === myId);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };
  const openEdit = (r) => {
    setForm({
      id: r.id,
      title: r.title,
      tool: r.tool,
      category: r.category,
      prompt: r.prompt,
      note: r.note,
    });
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
    if (!form.prompt.trim()) {
      setFormError("Isi prompt wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        const updated = await updatePrompt(form.id, form);
        setRows((p) => p.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createPrompt(form, myId);
        setRows((p) => [created, ...p]);
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

  const handleDelete = async (r) => {
    if (!window.confirm(`Hapus "${r.title}"?`)) return;
    setRowBusyId(r.id);
    try {
      await deletePrompt(r.id);
      setRows((p) => p.filter((x) => x.id !== r.id));
      setDetailItem((d) => (d?.id === r.id ? null : d));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
    }
  };

  const handleCopy = async (r, e) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(r.prompt);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId((id) => (id === r.id ? null : id)), 1500);
    } catch {
      window.alert("Gagal menyalin — salin manual dari detail prompt.");
    }
  };

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Bank Prompt
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Kumpulan prompt AI/LLM tim. Semua boleh nambah & ubah; hapus cuma
          punya sendiri (admin: semua).
        </p>
      </div>

      {msg && (
        <p
          className={`text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}
        >
          {msg.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul / isi / tool…"
            className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={activeCat}
            onChange={(e) => setCat(e.target.value)}
            className={filterCls}
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
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 sm:ml-auto"
        >
          <Plus size={14} strokeWidth={2.6} /> Tambah prompt
        </button>
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? "Ubah prompt" : "Prompt baru"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Judul
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="mis. Bikin soal HOTS dari materi"
              className={fieldCls}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Tool / model target
              <input
                value={form.tool}
                onChange={(e) => set("tool", e.target.value)}
                placeholder="mis. ChatGPT, Claude, Gemini"
                className={fieldCls}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Kategori
              <input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                list="prompt-categories"
                placeholder="mis. Soal, Silabus, Rangkuman"
                className={fieldCls}
              />
              <datalist id="prompt-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
          </div>
          <label className="block text-xs font-medium text-zinc-600">
            Isi prompt
            <textarea
              value={form.prompt}
              onChange={(e) => set("prompt", e.target.value)}
              rows={10}
              placeholder="Kamu adalah guru matematika SMA. Buatkan 5 soal…"
              className={`${fieldCls} scroll-slim font-mono text-xs`}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Catatan cara pakai (opsional)
            <textarea
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              rows={2}
              placeholder="mis. ganti [TOPIK] dengan materinya, hasil paling bagus di Claude"
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
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : status === "error" ? (
        <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-12 text-center text-sm text-rose-500">
          Gagal memuat data.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada prompt. Tambah yang sering kepake biar bisa dipakai bareng.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Nggak ada yang cocok.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => {
            const copied = copiedId === r.id;
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetailItem(r)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailItem(r);
                  }
                }}
                className="flex cursor-pointer flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 text-left transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug text-zinc-900">
                    {r.title || "Tanpa judul"}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleCopy(r, e)}
                    aria-label="Salin prompt"
                    className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
                      copied
                        ? "border-teal-200 bg-teal-50 text-teal-700"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Tersalin" : "Salin"}
                  </button>
                </div>
                <Chips p={r} />
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap rounded-lg bg-zinc-50 p-2 font-mono text-[11px] leading-relaxed text-zinc-600">
                  {r.prompt}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem?.title}
      >
        {detailItem && (
          <div className="flex flex-col gap-3">
            <Chips p={detailItem} />
            <p className="scroll-slim max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800">
              {detailItem.prompt}
            </p>
            {detailItem.note && (
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-500">
                <span className="font-semibold text-zinc-600">
                  Cara pakai:{" "}
                </span>
                {detailItem.note}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
              <button
                onClick={(e) => handleCopy(detailItem, e)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
              >
                {copiedId === detailItem.id ? (
                  <Check size={13} />
                ) : (
                  <Copy size={13} />
                )}
                {copiedId === detailItem.id ? "Tersalin" : "Salin"}
              </button>
              <button
                onClick={() => {
                  const r = detailItem;
                  setDetailItem(null);
                  openEdit(r);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <Pencil size={13} /> Ubah
              </button>
              {canDelete(detailItem) && (
                <button
                  onClick={() => handleDelete(detailItem)}
                  disabled={rowBusyId === detailItem.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                >
                  <Trash2 size={13} /> Hapus
                </button>
              )}
              <button
                onClick={() => setDetailItem(null)}
                className="ml-auto rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

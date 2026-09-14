import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import Markdown from "../components/ui/Markdown";
import { useAuth } from "../context/auth-context";
import {
  getMaterial,
  updateMaterial,
  deleteMaterial,
} from "../lib/materials";

const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";

export default function MaterialPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [material, setMaterial] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [busy, setBusy] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", link: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getMaterial(id)
      .then((m) => {
        if (!alive) return;
        setMaterial(m);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[b2b] gagal memuat bahan ajar:", err);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const openEdit = () => {
    setForm({
      title: material.title,
      content: material.content,
      link: material.link ?? "",
    });
    setFormError("");
    setShowEdit(true);
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
      const updated = await updateMaterial(id, form);
      setMaterial(updated);
      setShowEdit(false);
    } catch (err) {
      setFormError(err?.message ?? "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Hapus bahan ajar "${material.title}"?`)) return;
    setBusy(true);
    try {
      await deleteMaterial(id);
      navigate("/b2b?tab=materi", { replace: true });
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
      setBusy(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="mx-auto flex max-w-[760px] flex-col gap-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (status === "error" || !material) {
    return (
      <div className="mx-auto flex max-w-[760px] flex-col gap-4">
        <Link
          to="/b2b?tab=materi"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
        >
          <ArrowLeft size={14} /> B2B Center
        </Link>
        <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-12 text-center text-sm text-rose-500">
          Gagal memuat bahan ajar.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6">
      <div>
        <Link
          to="/b2b?tab=materi"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
        >
          <ArrowLeft size={14} /> B2B Center
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            {material.title || "Tanpa judul"}
          </h1>
          {isAdmin && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={openEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <Pencil size={14} /> Ubah
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
              >
                <Trash2 size={14} /> Hapus
              </button>
            </div>
          )}
        </div>
        {material.link && (
          <a
            href={material.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 underline underline-offset-2"
          >
            <ExternalLink size={12} /> {material.link}
          </a>
        )}
      </div>

      {material.content ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4">
          <Markdown text={material.content} />
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada isi.
        </p>
      )}

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Ubah bahan ajar">
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Judul
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="mis. Modul Fungsi Kuadrat"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Link (opsional)
            <input
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              placeholder="https://drive.google.com/…"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Isi (markdown)
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={14}
              placeholder={"## Ringkasan\n- Poin 1\n- Poin 2"}
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
              onClick={() => setShowEdit(false)}
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

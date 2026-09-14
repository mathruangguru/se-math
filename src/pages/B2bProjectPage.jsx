import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ClipboardCopy, Pencil } from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import Markdown from "../components/ui/Markdown";
import { useAuth } from "../context/auth-context";
import { shortDate } from "../lib/date";
import { getB2bProject, updateProjectSyllabus } from "../lib/b2b";
import { listSyllabusTemplates } from "../lib/syllabus";

const STATUS_META = {
  berjalan: { label: "Berjalan", cls: "bg-sky-100 text-sky-700" },
  selesai: { label: "Selesai", cls: "bg-teal-100 text-teal-700" },
  batal: { label: "Batal", cls: "bg-zinc-100 text-zinc-500" },
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
              Belum ada template. Bikin dulu di menu{" "}
              <Link to="/silabus" className="font-semibold text-brand-600 underline">
                Silabus
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

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import SegmentedControl from "../components/ui/SegmentedControl";
import { useAuth } from "../context/auth-context";
import { shortDate } from "../lib/date";
import {
  listB2bProjects,
  createB2bProject,
  updateB2bProject,
  deleteB2bProject,
} from "../lib/b2b";
import {
  listSyllabusTemplates,
  createSyllabusTemplate,
  updateSyllabusTemplate,
  deleteSyllabusTemplate,
} from "../lib/syllabus";
import {
  listMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from "../lib/materials";

const MODES = [
  { value: "deals", label: "Deals" },
  { value: "silabus", label: "Silabus" },
  { value: "materi", label: "Bahan Ajar" },
];
const VALID_MODES = new Set(MODES.map((m) => m.value));

const STATUSES = [
  { value: "berjalan", label: "Berjalan", cls: "bg-sky-100 text-sky-700" },
  { value: "selesai", label: "Selesai", cls: "bg-teal-100 text-teal-700" },
  { value: "batal", label: "Batal", cls: "bg-zinc-100 text-zinc-500" },
];
const statusMeta = (v) => STATUSES.find((s) => s.value === v) ?? STATUSES[0];

const emptyProjectForm = {
  id: null,
  client_name: "",
  package: "",
  category: "",
  status: "berjalan",
  start_date: "",
  note: "",
};
const emptyTemplateForm = { id: null, title: "", content: "" };
const emptyMaterialForm = { id: null, title: "", content: "", link: "" };
const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";

export default function B2bCenterPage() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(() => {
    const tab = searchParams.get("tab");
    return VALID_MODES.has(tab) ? tab : "deals";
  });
  const [msg, setMsg] = useState(null); // { ok, text }

  // ── Deals ───────────────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [rowBusyId, setRowBusyId] = useState(null);
  const [qDeals, setQDeals] = useState("");

  const [form, setForm] = useState(emptyProjectForm);
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

  const filteredDeals = useMemo(() => {
    const needle = qDeals.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.client_name.toLowerCase().includes(needle) ||
        r.package.toLowerCase().includes(needle) ||
        r.category.toLowerCase().includes(needle) ||
        r.note.toLowerCase().includes(needle)
    );
  }, [rows, qDeals]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm(emptyProjectForm);
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
      category: r.category,
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

  // ── Silabus (template) ─────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [tplStatus, setTplStatus] = useState("loading"); // loading | error | ready
  const [tplBusyId, setTplBusyId] = useState(null);
  const [qTpl, setQTpl] = useState("");

  const [tplForm, setTplForm] = useState(emptyTemplateForm);
  const [showTplForm, setShowTplForm] = useState(false);
  const [tplFormError, setTplFormError] = useState("");
  const [tplSaving, setTplSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    listSyllabusTemplates()
      .then((data) => {
        if (!alive) return;
        setTemplates(data);
        setTplStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[silabus] gagal memuat:", err);
        setTplStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const filteredTemplates = useMemo(() => {
    const needle = qTpl.trim().toLowerCase();
    if (!needle) return templates;
    return templates.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        r.content.toLowerCase().includes(needle)
    );
  }, [templates, qTpl]);

  const setTF = (key, val) => setTplForm((f) => ({ ...f, [key]: val }));

  const openTplCreate = () => {
    setTplForm(emptyTemplateForm);
    setTplFormError("");
    setShowTplForm(true);
  };
  const openTplEdit = (r, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setTplForm({ id: r.id, title: r.title, content: r.content });
    setTplFormError("");
    setShowTplForm(true);
  };

  const handleTplSave = async (e) => {
    e.preventDefault();
    setTplFormError("");
    if (!tplForm.title.trim()) {
      setTplFormError("Judul wajib diisi.");
      return;
    }
    setTplSaving(true);
    try {
      if (tplForm.id) {
        const updated = await updateSyllabusTemplate(tplForm.id, tplForm);
        setTemplates((p) => p.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createSyllabusTemplate(tplForm, null);
        setTemplates((p) => [created, ...p]);
      }
      setShowTplForm(false);
      setMsg({ ok: true, text: "Tersimpan." });
    } catch (err) {
      setTplFormError(err?.message ?? "Gagal menyimpan.");
    } finally {
      setTplSaving(false);
    }
  };

  const handleTplDelete = async (r, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!window.confirm(`Hapus silabus "${r.title}"?`)) return;
    setTplBusyId(r.id);
    try {
      await deleteSyllabusTemplate(r.id);
      setTemplates((p) => p.filter((x) => x.id !== r.id));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setTplBusyId(null);
    }
  };

  // ── Bahan ajar (katalog berdiri sendiri, mirip silabus) ─────────
  const [materials, setMaterials] = useState([]);
  const [matStatus, setMatStatus] = useState("loading"); // loading | error | ready
  const [matBusyId, setMatBusyId] = useState(null);
  const [qMat, setQMat] = useState("");

  const [matForm, setMatForm] = useState(emptyMaterialForm);
  const [showMatForm, setShowMatForm] = useState(false);
  const [matFormError, setMatFormError] = useState("");
  const [matSaving, setMatSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    listMaterials()
      .then((data) => {
        if (!alive) return;
        setMaterials(data);
        setMatStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[b2b] gagal memuat bahan ajar:", err);
        setMatStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const filteredMaterials = useMemo(() => {
    const needle = qMat.trim().toLowerCase();
    if (!needle) return materials;
    return materials.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        r.content.toLowerCase().includes(needle)
    );
  }, [materials, qMat]);

  const setMF = (key, val) => setMatForm((f) => ({ ...f, [key]: val }));

  const openMatCreate = () => {
    setMatForm(emptyMaterialForm);
    setMatFormError("");
    setShowMatForm(true);
  };
  const openMatEdit = (r, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setMatForm({ id: r.id, title: r.title, content: r.content, link: r.link ?? "" });
    setMatFormError("");
    setShowMatForm(true);
  };

  const handleMatSave = async (e) => {
    e.preventDefault();
    setMatFormError("");
    if (!matForm.title.trim()) {
      setMatFormError("Judul wajib diisi.");
      return;
    }
    setMatSaving(true);
    try {
      if (matForm.id) {
        const updated = await updateMaterial(matForm.id, matForm);
        setMaterials((p) => p.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createMaterial(matForm, null);
        setMaterials((p) => [created, ...p]);
      }
      setShowMatForm(false);
      setMsg({ ok: true, text: "Tersimpan." });
    } catch (err) {
      setMatFormError(err?.message ?? "Gagal menyimpan.");
    } finally {
      setMatSaving(false);
    }
  };

  const handleMatDelete = async (r, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!window.confirm(`Hapus bahan ajar "${r.title}"?`)) return;
    setMatBusyId(r.id);
    try {
      await deleteMaterial(r.id);
      setMaterials((p) => p.filter((x) => x.id !== r.id));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setMatBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            B2B Center
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {mode === "deals"
              ? "Project B2B — klien, paket yang deal, dan silabusnya."
              : mode === "silabus"
                ? "Template silabus (markdown) — bikin di sini, nanti tinggal di-insert ke project."
                : "Katalog bahan ajar (markdown + link opsional) — referensi berdiri sendiri, nggak terikat project."}
          </p>
        </div>
        <SegmentedControl options={MODES} value={mode} onChange={setMode} />
      </div>

      {msg && (
        <p
          className={`text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}
        >
          {msg.text}
        </p>
      )}

      {mode === "deals" ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              value={qDeals}
              onChange={(e) => setQDeals(e.target.value)}
              placeholder="Cari klien / paket…"
              className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white"
            />
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 sm:ml-auto"
            >
              <Plus size={14} strokeWidth={2.6} /> Tambah project
            </button>
          )}
        </div>
      ) : mode === "silabus" ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              value={qTpl}
              onChange={(e) => setQTpl(e.target.value)}
              placeholder="Cari judul / isi…"
              className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white"
            />
          </div>
          {isAdmin && (
            <button
              onClick={openTplCreate}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 sm:ml-auto"
            >
              <Plus size={14} strokeWidth={2.6} /> Tambah silabus
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              value={qMat}
              onChange={(e) => setQMat(e.target.value)}
              placeholder="Cari judul / isi…"
              className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white"
            />
          </div>
          {isAdmin && (
            <button
              onClick={openMatCreate}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 sm:ml-auto"
            >
              <Plus size={14} strokeWidth={2.6} /> Tambah bahan ajar
            </button>
          )}
        </div>
      )}

      {/* Form tambah / edit project */}
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
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Paket yang deal
              <input
                value={form.package}
                onChange={(e) => set("package", e.target.value)}
                placeholder="mis. Paket Intensif 20 sesi"
                className={fieldCls}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Kategori
              <input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="mis. Pelatihan Guru"
                className={fieldCls}
              />
            </label>
          </div>
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

      {/* Form tambah / edit template silabus */}
      <Modal
        open={showTplForm}
        onClose={() => setShowTplForm(false)}
        title={tplForm.id ? "Ubah silabus" : "Silabus baru"}
      >
        <form onSubmit={handleTplSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Judul
            <input
              value={tplForm.title}
              onChange={(e) => setTF("title", e.target.value)}
              placeholder="mis. Silabus Kelas 10 Semester 1"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Isi (markdown)
            <textarea
              value={tplForm.content}
              onChange={(e) => setTF("content", e.target.value)}
              rows={12}
              placeholder={"## Bab 1 — Fungsi\n- Fungsi Linear\n- Fungsi Kuadrat\n\n## Bab 2 — Trigonometri\n- Sudut & Radian"}
              className={`${fieldCls} scroll-slim font-mono text-xs`}
            />
          </label>

          {tplFormError && <p className="text-xs text-rose-600">{tplFormError}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={tplSaving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {tplSaving ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              onClick={() => setShowTplForm(false)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>

      {/* Form tambah / edit bahan ajar */}
      <Modal
        open={showMatForm}
        onClose={() => setShowMatForm(false)}
        title={matForm.id ? "Ubah bahan ajar" : "Bahan ajar baru"}
      >
        <form onSubmit={handleMatSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Judul
            <input
              value={matForm.title}
              onChange={(e) => setMF("title", e.target.value)}
              placeholder="mis. Modul Fungsi Kuadrat"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Link (opsional)
            <input
              value={matForm.link}
              onChange={(e) => setMF("link", e.target.value)}
              placeholder="https://drive.google.com/…"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Isi (markdown)
            <textarea
              value={matForm.content}
              onChange={(e) => setMF("content", e.target.value)}
              rows={12}
              placeholder={"## Ringkasan\n- Poin 1\n- Poin 2"}
              className={`${fieldCls} scroll-slim font-mono text-xs`}
            />
          </label>

          {matFormError && <p className="text-xs text-rose-600">{matFormError}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={matSaving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {matSaving ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              onClick={() => setShowMatForm(false)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>

      {/* Isi */}
      {mode === "deals" ? (
        status === "loading" ? (
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
        ) : filteredDeals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
            Nggak ada yang cocok.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredDeals.map((r) => {
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
                  {(r.package || r.category) && (
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-zinc-600">
                      {r.package}
                      {r.package && r.category && (
                        <span className="text-zinc-300">·</span>
                      )}
                      {r.category && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                          {r.category}
                        </span>
                      )}
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
        )
      ) : mode === "silabus" ? (
        tplStatus === "loading" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : tplStatus === "error" ? (
        <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-12 text-center text-sm text-rose-500">
          Gagal memuat data.
        </p>
      ) : templates.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada silabus{isAdmin ? ". Tambah satu." : "."}
        </p>
      ) : filteredTemplates.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Nggak ada yang cocok.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredTemplates.map((r) => (
            <Link
              key={r.id}
              to={`/b2b/silabus/${r.id}`}
              className="group flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-snug text-zinc-900">
                  {r.title || "Tanpa judul"}
                </p>
                {isAdmin && (
                  <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => openTplEdit(r, e)}
                      aria-label="Ubah"
                      className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => handleTplDelete(r, e)}
                      disabled={tplBusyId === r.id}
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
            </Link>
          ))}
        </div>
        )
      ) : matStatus === "loading" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : matStatus === "error" ? (
        <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-12 text-center text-sm text-rose-500">
          Gagal memuat data.
        </p>
      ) : materials.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada bahan ajar{isAdmin ? ". Tambah satu." : "."}
        </p>
      ) : filteredMaterials.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Nggak ada yang cocok.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredMaterials.map((r) => (
            <Link
              key={r.id}
              to={`/b2b/materi/${r.id}`}
              className="group flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-snug text-zinc-900">
                  {r.title || "Tanpa judul"}
                </p>
                {isAdmin && (
                  <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => openMatEdit(r, e)}
                      aria-label="Ubah"
                      className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => handleMatDelete(r, e)}
                      disabled={matBusyId === r.id}
                      aria-label="Hapus"
                      className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                )}
              </div>
              {r.link && (
                <p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-brand-600">
                  <Link2 size={11} className="shrink-0" />
                  <span className="truncate">{r.link}</span>
                </p>
              )}
              {r.content && (
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-zinc-500">
                  {r.content}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Clock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import { useAuth } from "../context/auth-context";
import { listPeople, personShort } from "../lib/people";
import {
  listPotentialWork,
  createPotentialWork,
  updatePotentialWork,
  deletePotentialWork,
} from "../lib/potential";

const emptyForm = { id: null, title: "", detail: "", eta: "", source: "" };
const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";

export default function PotentialWorkPage() {
  const { profile } = useAuth();
  const myId = profile?.id ?? null;

  const [rows, setRows] = useState([]);
  const [people, setPeople] = useState([]);
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
    Promise.all([listPotentialWork(), listPeople().catch(() => [])])
      .then(([w, p]) => {
        if (!alive) return;
        setRows(w);
        setPeople(p);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[potential] gagal memuat:", err);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const personById = useMemo(() => {
    const m = new Map();
    for (const p of people) m.set(p.id, p);
    return m;
  }, [people]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        r.detail.toLowerCase().includes(needle) ||
        r.eta.toLowerCase().includes(needle) ||
        (r.source ?? "").toLowerCase().includes(needle)
    );
  }, [rows, q]);

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
      detail: r.detail,
      eta: r.eta,
      source: r.source ?? "",
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
    setSaving(true);
    try {
      if (form.id) {
        const updated = await updatePotentialWork(form.id, form);
        setRows((p) => p.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createPotentialWork(form, myId);
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
      await deletePotentialWork(r.id);
      setRows((p) => p.filter((x) => x.id !== r.id));
      setDetailItem((d) => (d?.id === r.id ? null : d));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Potential Work
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Kerjaan yang kemungkinan bakal masuk — catat di sini biar nggak
            lupa. Semua boleh nambah.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
        >
          <Plus size={14} strokeWidth={2.6} /> Tambah
        </button>
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
          placeholder="Cari…"
          className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white sm:max-w-xs"
        />
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? "Ubah item" : "Potential work baru"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Judul
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Bikin bank soal olimpiade"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Catatan
            <textarea
              value={form.detail}
              onChange={(e) => set("detail", e.target.value)}
              rows={3}
              placeholder="Konteks, kenapa bakal muncul, apa yang perlu disiapin…"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Perkiraan waktu
            <input
              value={form.eta}
              onChange={(e) => set("eta", e.target.value)}
              placeholder="mis. abis Tryout Ep 3, Q4, nunggu approval"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Sumber
            <input
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder="mis. rapat mingguan, obrolan sama Pak Budi, link doc"
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
          Belum ada. Catat kerjaan yang mungkin bakal masuk biar nggak lupa.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Nggak ada yang cocok.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => {
            const by = r.created_by ? personById.get(r.created_by) : null;
            return (
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
                className="flex cursor-pointer flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 text-left transition-shadow hover:shadow-sm"
              >
                <p className="text-sm font-semibold leading-snug text-zinc-900">
                  {r.title}
                </p>
                {r.detail && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                    {r.detail}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                  {r.eta && (
                    <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600">
                      <Clock size={11} />
                      {r.eta}
                    </span>
                  )}
                  {r.source && (
                    <span className="max-w-[45%] truncate">dari {r.source}</span>
                  )}
                  {by && <span>— {personShort(by)}</span>}
                </div>
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
            {detailItem.detail ? (
              <p className="scroll-slim max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {detailItem.detail}
              </p>
            ) : (
              <p className="text-sm text-zinc-400">Nggak ada catatan.</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
              {detailItem.eta && (
                <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600">
                  <Clock size={11} />
                  {detailItem.eta}
                </span>
              )}
              {detailItem.source && <span>dari {detailItem.source}</span>}
              {detailItem.created_by &&
                personById.get(detailItem.created_by) && (
                  <span>
                    — {personShort(personById.get(detailItem.created_by))}
                  </span>
                )}
            </div>
            <div className="flex items-center gap-2 border-t border-zinc-100 pt-3">
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
              <button
                onClick={() => handleDelete(detailItem)}
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
          </div>
        )}
      </Modal>
    </div>
  );
}

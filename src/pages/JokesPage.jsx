import { useEffect, useMemo, useState } from "react";
import {
  HelpCircle,
  Lightbulb,
  Pencil,
  Plus,
  Search,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import { useAuth } from "../context/auth-context";
import { listPeople, personShort } from "../lib/people";
import { listJokes, createJoke, updateJoke, deleteJoke } from "../lib/jokes";

const emptyForm = { id: null, front: "", back: "" };
const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";

function FlipCard({ front, back, flipped, onToggle, footer, actions, big }) {
  const textSize = big ? "text-base" : "text-sm";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`group/card relative w-full cursor-pointer select-none [perspective:1200px] ${
        big ? "h-56" : "h-44"
      }`}
    >
      <div
        className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Depan — tebakan */}
        <div className="absolute inset-0 flex flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white p-4 [backface-visibility:hidden]">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              <HelpCircle size={12} /> Tebakan
            </span>
            {actions}
          </div>
          <p
            className={`scroll-slim flex flex-1 items-center overflow-y-auto ${textSize} font-medium leading-snug text-zinc-900`}
          >
            {front}
          </p>
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>{footer}</span>
            <span className="text-zinc-300">klik buat balik</span>
          </div>
        </div>

        {/* Belakang — jawaban */}
        <div className="absolute inset-0 flex flex-col gap-2 rounded-2xl border border-brand-200 bg-brand-50 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-brand-500">
            <Lightbulb size={12} /> Jawaban
          </span>
          <p
            className={`scroll-slim flex flex-1 items-center overflow-y-auto ${textSize} font-medium leading-snug text-brand-900`}
          >
            {back}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function JokesPage() {
  const { profile, isAdmin } = useAuth();
  const myId = profile?.id ?? null;

  const [rows, setRows] = useState([]);
  const [people, setPeople] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [msg, setMsg] = useState(null); // { ok, text }
  const [rowBusyId, setRowBusyId] = useState(null);

  const [q, setQ] = useState("");
  const [flipped, setFlipped] = useState(() => new Set());
  const [spotId, setSpotId] = useState(null);
  const [spotFlipped, setSpotFlipped] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([listJokes(), listPeople().catch(() => [])])
      .then(([j, p]) => {
        if (!alive) return;
        setRows(j);
        setPeople(p);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[jokes] gagal memuat:", err);
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
      (j) =>
        j.front.toLowerCase().includes(needle) ||
        j.back.toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const spotJoke = spotId ? rows.find((j) => j.id === spotId) : null;

  const canManage = (j) => isAdmin || (myId && j.created_by === myId);

  const contributorLabel = (j) => {
    const p = j.created_by ? personById.get(j.created_by) : null;
    return p ? `— ${personShort(p)}` : "";
  };

  const toggleFlip = (id) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleShuffle = () => {
    if (filtered.length === 0) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setSpotId(pick.id);
    setSpotFlipped(false);
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };
  const openEdit = (j) => {
    setForm({ id: j.id, front: j.front, back: j.back });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    const front = form.front.trim();
    const back = form.back.trim();
    if (!front || !back) {
      setFormError("Tebakan dan jawaban dua-duanya wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        const updated = await updateJoke(form.id, { front, back });
        setRows((prev) =>
          prev.map((j) => (j.id === form.id ? { ...j, ...updated } : j))
        );
      } else {
        const created = await createJoke({ front, back }, myId);
        setRows((prev) => [created, ...prev]);
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

  const handleDelete = async (j) => {
    if (!window.confirm("Hapus joke ini?")) return;
    setRowBusyId(j.id);
    try {
      await deleteJoke(j.id);
      setRows((prev) => prev.filter((x) => x.id !== j.id));
      if (spotId === j.id) setSpotId(null);
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
    }
  };

  const cardActions = (j) =>
    canManage(j) ? (
      <span className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/card:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEdit(j);
          }}
          aria-label="Ubah"
          className="inline-grid h-6 w-6 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(j);
          }}
          disabled={rowBusyId === j.id}
          aria-label="Hapus"
          className="inline-grid h-6 w-6 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
        >
          <Trash2 size={12} />
        </button>
      </span>
    ) : null;

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Jokes Corner
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Kartu tebak-tebakan — klik buat lihat jawabannya. Semua boleh
            nyumbang. 😄
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
        >
          <Plus size={14} strokeWidth={2.6} /> Tambah joke
        </button>
      </div>

      {msg && (
        <p
          className={`text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}
        >
          {msg.text}
        </p>
      )}

      {/* Kontrol */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari tebakan / jawaban…"
            className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white"
          />
        </div>
        <button
          onClick={handleShuffle}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40"
        >
          <Shuffle size={14} /> Acak
        </button>
      </div>

      {/* Kartu acak */}
      {spotJoke && (
        <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
              Kartu acak
            </span>
            <button
              onClick={() => setSpotId(null)}
              aria-label="Tutup"
              className="inline-grid h-6 w-6 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-white hover:text-zinc-700"
            >
              <X size={14} />
            </button>
          </div>
          <FlipCard
            big
            front={spotJoke.front}
            back={spotJoke.back}
            flipped={spotFlipped}
            onToggle={() => setSpotFlipped((v) => !v)}
            footer={contributorLabel(spotJoke)}
            actions={cardActions(spotJoke)}
          />
          <button
            onClick={handleShuffle}
            className="mt-2 inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
          >
            <Shuffle size={13} /> Acak lagi
          </button>
        </div>
      )}

      {/* Grid */}
      {status === "loading" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : status === "error" ? (
        <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-12 text-center text-sm text-rose-500">
          Gagal memuat data.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada joke. Tambah yang pertama! 🎉
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Nggak ada yang cocok.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((j) => (
            <FlipCard
              key={j.id}
              front={j.front}
              back={j.back}
              flipped={flipped.has(j.id)}
              onToggle={() => toggleFlip(j.id)}
              footer={contributorLabel(j)}
              actions={cardActions(j)}
            />
          ))}
        </div>
      )}

      {/* Form tambah / edit */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? "Ubah joke" : "Joke baru"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Tebakan (depan)
            <textarea
              value={form.front}
              onChange={(e) => set("front", e.target.value)}
              rows={3}
              placeholder="Hewan apa yang paling jago matematika?"
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Jawaban (belakang)
            <textarea
              value={form.back}
              onChange={(e) => set("back", e.target.value)}
              rows={3}
              placeholder="Kalkul-ular 🐍"
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
    </div>
  );
}

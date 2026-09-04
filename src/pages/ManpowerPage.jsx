import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";
import Avatar from "../components/ui/Avatar";
import { useAuth } from "../context/auth-context";
import { todayStr, fullDate, shortDate } from "../lib/date";
import { listPeople, personName } from "../lib/people";
import {
  listDailyReports,
  createDailyReport,
  updateDailyReport,
  deleteDailyReport,
} from "../lib/daily";

const fieldCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";

function emptyForm(date) {
  return {
    id: null,
    report_date: date,
    activity: "",
    category: "",
    alloc_value: "",
    alloc_unit: "jam",
  };
}

function shiftDate(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const fmtNum = (n) => String(Math.round(Number(n) * 10) / 10);

export default function ManpowerPage() {
  const { profile, isAdmin } = useAuth();
  const myId = profile?.id ?? null;

  const [date, setDate] = useState(todayStr);
  const [rows, setRows] = useState([]);
  const [people, setPeople] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [msg, setMsg] = useState(null); // { ok, text }
  const [rowBusyId, setRowBusyId] = useState(null);

  const [form, setForm] = useState(() => emptyForm(todayStr()));
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset status pas ganti tanggal (adjust state saat render).
  const [prevDate, setPrevDate] = useState(date);
  if (date !== prevDate) {
    setPrevDate(date);
    setStatus("loading");
    setRows([]);
  }

  useEffect(() => {
    listPeople()
      .then(setPeople)
      .catch(() => setPeople([]));
  }, []);

  useEffect(() => {
    let alive = true;
    listDailyReports({ from: date, to: date })
      .then((d) => {
        if (!alive) return;
        setRows(d);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[manpower] gagal memuat:", err);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [date]);

  const personById = useMemo(() => {
    const m = new Map();
    for (const p of people) m.set(p.id, p);
    return m;
  }, [people]);

  const groups = useMemo(() => {
    const byP = new Map();
    for (const r of rows) {
      if (!byP.has(r.person_id)) byP.set(r.person_id, []);
      byP.get(r.person_id).push(r);
    }
    const arr = [...byP.entries()].map(([pid, entries]) => {
      const person = personById.get(pid);
      const totalJam = entries.reduce(
        (s, e) =>
          s +
          (e.alloc_unit === "jam" && e.alloc_value ? Number(e.alloc_value) : 0),
        0
      );
      return {
        pid,
        name: person ? personName(person) : "Tanpa nama",
        entries,
        totalJam,
      };
    });
    arr.sort((a, b) => a.name.localeCompare(b.name, "id"));
    return arr;
  }, [rows, personById]);

  const categories = useMemo(() => {
    const s = new Set();
    for (const r of rows) {
      const c = (r.category ?? "").trim();
      if (c) s.add(c);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm(emptyForm(date));
    setFormError("");
    setShowForm(true);
  };
  const openEdit = (r) => {
    setForm({
      id: r.id,
      report_date: r.report_date,
      activity: r.activity,
      category: r.category,
      alloc_value: r.alloc_value ?? "",
      alloc_unit: r.alloc_unit,
    });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.activity.trim()) {
      setFormError("Kegiatan wajib diisi.");
      return;
    }
    if (!form.report_date) {
      setFormError("Tanggal wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        const updated = await updateDailyReport(form.id, form);
        if (updated.report_date === date) {
          setRows((p) => p.map((r) => (r.id === updated.id ? updated : r)));
        } else {
          setRows((p) => p.filter((r) => r.id !== updated.id));
          setMsg({
            ok: true,
            text: `Dipindah ke ${shortDate(updated.report_date)}.`,
          });
        }
      } else {
        const created = await createDailyReport(form, myId);
        if (created.report_date === date) {
          setRows((p) => [created, ...p]);
        } else {
          setDate(created.report_date);
        }
      }
      setShowForm(false);
    } catch (err) {
      setFormError(err?.message ?? "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm("Hapus entri ini?")) return;
    setRowBusyId(r.id);
    try {
      await deleteDailyReport(r.id);
      setRows((p) => p.filter((x) => x.id !== r.id));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
    }
  };

  const isToday = date === todayStr();

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Manpower Allocation
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {isAdmin
            ? "Laporan harian tim — siapa ngerjain apa per hari."
            : "Laporan harian kamu. Cuma admin yang lihat rekap semua orang."}
        </p>
      </div>

      {msg && (
        <p
          className={`text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}
        >
          {msg.text}
        </p>
      )}

      {/* Bar tanggal */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setDate((d) => shiftDate(d, -1))}
          aria-label="Hari sebelumnya"
          className="inline-grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50"
        >
          <ChevronLeft size={16} />
        </button>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="h-9 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none transition-colors focus:border-brand-500 focus:bg-white"
        />
        <button
          onClick={() => setDate((d) => shiftDate(d, 1))}
          disabled={isToday}
          aria-label="Hari berikutnya"
          className="inline-grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
        {!isToday && (
          <button
            onClick={() => setDate(todayStr())}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Hari ini
          </button>
        )}
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 sm:ml-auto"
        >
          <Plus size={14} strokeWidth={2.6} /> Tambah entri
        </button>
      </div>

      <p className="-mt-3 text-xs capitalize text-zinc-400">{fullDate(date)}</p>

      {/* Form */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? "Ubah entri" : "Entri baru"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="block text-xs font-medium text-zinc-600">
            Tanggal
            <input
              type="date"
              value={form.report_date}
              max={todayStr()}
              onChange={(e) => set("report_date", e.target.value)}
              className={fieldCls}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Kegiatan
            <textarea
              value={form.activity}
              onChange={(e) => set("activity", e.target.value)}
              rows={3}
              placeholder="Review 40 soal Tryout Ep 3"
              className={fieldCls}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Kategori / stream
              <input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                list="mp-cats"
                placeholder="mis. Tryout, Hyperlist, Rapor"
                className={fieldCls}
              />
              <datalist id="mp-cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Alokasi
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.alloc_value}
                  onChange={(e) => set("alloc_value", e.target.value)}
                  placeholder="4"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500"
                />
                <select
                  value={form.alloc_unit}
                  onChange={(e) => set("alloc_unit", e.target.value)}
                  className="rounded-lg border border-zinc-300 px-2 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500"
                >
                  <option value="jam">jam</option>
                  <option value="persen">%</option>
                </select>
              </div>
            </label>
          </div>

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

      {/* Isi */}
      {status === "loading" ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : status === "error" ? (
        <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-12 text-center text-sm text-rose-500">
          Gagal memuat data.
        </p>
      ) : groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada laporan buat tanggal ini.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <div
              key={g.pid}
              className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white"
            >
              <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-2.5">
                <Avatar name={g.name} id={g.pid} size={24} />
                <span className="text-sm font-semibold text-zinc-900">
                  {g.name}
                </span>
                {g.totalJam > 0 && (
                  <span className="ml-auto text-xs text-zinc-400">
                    {fmtNum(g.totalJam)} jam
                  </span>
                )}
              </div>
              <div className="divide-y divide-zinc-100">
                {g.entries.map((r) => (
                  <div
                    key={r.id}
                    className="group flex items-start gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap text-sm text-zinc-800">
                        {r.activity || "—"}
                      </p>
                      {(r.category || r.alloc_value != null) && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                          {r.category && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600">
                              {r.category}
                            </span>
                          )}
                          {r.alloc_value != null && (
                            <span>
                              {fmtNum(r.alloc_value)}{" "}
                              {r.alloc_unit === "jam" ? "jam" : "%"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {(isAdmin || r.person_id === myId) && (
                      <span className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(r)}
                          aria-label="Ubah"
                          className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          disabled={rowBusyId === r.id}
                          aria-label="Hapus"
                          className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        >
                          <Trash2 size={13} />
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

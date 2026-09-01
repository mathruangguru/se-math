import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays } from "lucide-react";
import {
  greeting,
  longDate,
  shortDate,
  deadlineTone,
  deadlineLabel,
} from "../lib/date";
import { useAuth } from "../context/auth-context";
import { user } from "../data/user";
import {
  listTasks,
  listSubtasks,
  listSubtaskAssignees,
  setSubtaskDone,
} from "../lib/tasks";

const PRIO_CLS = {
  P0: "bg-rose-100 text-rose-700",
  P1: "bg-brand-100 text-brand-700",
  P2: "bg-amber-100 text-amber-700",
  P3: "bg-sky-100 text-sky-700",
  P4: "bg-zinc-100 text-zinc-600",
};
const PRIO_RANK = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
const TONE_CLS = {
  overdue: "text-rose-600",
  soon: "text-amber-600",
  ok: "text-zinc-500",
};

// deadline task terdekat dulu (tanpa deadline paling belakang), lalu prioritas.
function cmp(a, b) {
  const ad = a.task.deadline;
  const bd = b.task.deadline;
  if (ad && bd) {
    if (ad !== bd) return ad < bd ? -1 : 1;
  } else if (ad) {
    return -1;
  } else if (bd) {
    return 1;
  }
  return (PRIO_RANK[a.task.priority] ?? 9) - (PRIO_RANK[b.task.priority] ?? 9);
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const myId = profile?.id ?? null;
  const firstName = profile?.first_name || user.firstName;

  const [tasks, setTasks] = useState([]);
  const [subs, setSubs] = useState([]);
  const [sa, setSa] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null); // { ok, text }

  useEffect(() => {
    let alive = true;
    Promise.all([
      listTasks(),
      listSubtasks(),
      listSubtaskAssignees().catch(() => []),
    ])
      .then(([t, s, a]) => {
        if (!alive) return;
        setTasks(t);
        setSubs(s);
        setSa(a);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[dashboard] gagal memuat:", err);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const taskById = useMemo(() => {
    const m = new Map();
    for (const t of tasks) m.set(t.id, t);
    return m;
  }, [tasks]);

  // Subtask yang di-assign ke aku, belum selesai, di task yang lagi "Dikerjakan".
  const myRows = useMemo(() => {
    if (!myId) return [];
    const mine = new Set(
      sa.filter((r) => r.person_id === myId).map((r) => r.subtask_id)
    );
    return subs
      .filter((s) => mine.has(s.id) && !s.done)
      .map((s) => ({ ...s, task: taskById.get(s.task_id) }))
      .filter((r) => r.task && r.task.status === "doing")
      .sort(cmp);
  }, [subs, sa, taskById, myId]);

  const handleDone = async (sub) => {
    setBusyId(sub.id);
    setSubs((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, done: true } : s))
    );
    try {
      await setSubtaskDone(sub.id, true);
      setMsg({ ok: true, text: `"${sub.title}" ditandai selesai.` });
    } catch (err) {
      setSubs((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, done: false } : s))
      );
      window.alert(`Gagal: ${err?.message ?? err}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      {/* Greeting */}
      <div>
        <p className="text-xs text-zinc-500">{longDate()}</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-900">
          {greeting()}, {firstName}! 👋
        </h1>
      </div>

      {/* Lagi kamu kerjain */}
      <section className="flex max-w-[760px] flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-zinc-900">
              Lagi kamu kerjain
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Subtask yang di-assign ke kamu di task yang lagi jalan. Centang
              kalau beres.
            </p>
          </div>
          <Link
            to="/task"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
          >
            Semua task <ArrowRight size={13} />
          </Link>
        </div>

        {msg && (
          <p
            className={`text-xs ${
              msg.ok ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {msg.text}
          </p>
        )}

        {status === "loading" ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-zinc-100"
              />
            ))}
          </div>
        ) : status === "error" ? (
          <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-10 text-center text-sm text-rose-500">
            Gagal memuat task.
          </p>
        ) : myRows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-400">
            Nggak ada subtask yang lagi kamu kerjain. 🎉
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {myRows.map((r) => {
              const tone = deadlineTone(r.task.deadline, r.task.status);
              return (
                <div
                  key={r.id}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200/80 bg-white p-3.5"
                >
                  <input
                    type="checkbox"
                    checked={false}
                    disabled={busyId === r.id}
                    onChange={() => handleDone(r)}
                    aria-label="Tandai selesai"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500 disabled:opacity-40"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-zinc-900">
                      {r.title}
                    </p>
                    <Link
                      to="/task"
                      className="mt-0.5 inline-block truncate text-xs text-zinc-400 transition-colors hover:text-zinc-600"
                    >
                      {r.task.title}
                    </Link>
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      PRIO_CLS[r.task.priority] ?? PRIO_CLS.P2
                    }`}
                  >
                    {r.task.priority}
                  </span>
                  {r.task.deadline ? (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 text-xs ${
                        TONE_CLS[tone] ?? "text-zinc-500"
                      }`}
                      title={shortDate(r.task.deadline)}
                    >
                      <CalendarDays size={12} />
                      {deadlineLabel(r.task.deadline, r.task.status)}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-zinc-300">
                      tanpa deadline
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

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

const PRIO_BAR = {
  P0: "bg-rose-400/80",
  P1: "bg-brand-400/80",
  P2: "bg-amber-400/80",
  P3: "bg-sky-400/80",
  P4: "bg-zinc-300",
};
const PRIO_RANK = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
const TONE_CLS = {
  overdue: "text-rose-600",
  soon: "text-amber-600",
  ok: "text-zinc-500",
};

// deadline task terdekat dulu (tanpa deadline paling belakang), lalu prioritas.
function cmpTask(a, b) {
  if (a.deadline && b.deadline) {
    if (a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
  } else if (a.deadline) {
    return -1;
  } else if (b.deadline) {
    return 1;
  }
  return (PRIO_RANK[a.priority] ?? 9) - (PRIO_RANK[b.priority] ?? 9);
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

  // Subtask yang di-assign ke aku, belum selesai, di task yang "Dikerjakan",
  // dikelompokkan per task induk.
  const groups = useMemo(() => {
    if (!myId) return [];
    const mine = new Set(
      sa.filter((r) => r.person_id === myId).map((r) => r.subtask_id)
    );
    const byTask = new Map(); // taskId -> { task, subs: [] }
    for (const s of subs) {
      if (!mine.has(s.id) || s.done) continue;
      const task = taskById.get(s.task_id);
      if (!task || task.status !== "doing") continue;
      if (!byTask.has(task.id)) byTask.set(task.id, { task, subs: [] });
      byTask.get(task.id).subs.push(s);
    }
    return [...byTask.values()].sort((a, b) => cmpTask(a.task, b.task));
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
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold tracking-tight text-zinc-900">
            Lagi kamu kerjain
          </h2>
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
        ) : groups.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-400">
            Nggak ada subtask yang lagi kamu kerjain. 🎉
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map(({ task, subs: gsubs }) => {
              const tone = deadlineTone(task.deadline, task.status);
              return (
                <div key={task.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-[2px] ${
                        PRIO_BAR[task.priority] ?? PRIO_BAR.P2
                      }`}
                    />
                    <Link
                      to="/task"
                      className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 transition-colors hover:text-brand-700"
                    >
                      {task.title}
                    </Link>
                    <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                      {task.priority}
                    </span>
                    {task.deadline ? (
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 text-xs ${
                          TONE_CLS[tone] ?? "text-zinc-500"
                        }`}
                        title={shortDate(task.deadline)}
                      >
                        <CalendarDays size={12} />
                        {deadlineLabel(task.deadline, task.status)}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-zinc-300">
                        tanpa deadline
                      </span>
                    )}
                  </div>
                  <div className="ml-1 mt-1.5 flex flex-col gap-1.5 border-l border-zinc-200 pl-3.5">
                    {gsubs.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 text-sm text-zinc-700"
                      >
                        <input
                          type="checkbox"
                          checked={false}
                          disabled={busyId === s.id}
                          onChange={() => handleDone(s)}
                          aria-label="Tandai selesai"
                          className="h-4 w-4 shrink-0 accent-brand-500 disabled:opacity-40"
                        />
                        <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

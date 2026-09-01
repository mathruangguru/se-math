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
import { listTasks, listSubtasks, listSubtaskAssignees } from "../lib/tasks";

const PRIO_CLS = {
  P0: "bg-rose-100 text-rose-700",
  P1: "bg-brand-100 text-brand-700",
  P2: "bg-amber-100 text-amber-700",
  P3: "bg-sky-100 text-sky-700",
  P4: "bg-zinc-100 text-zinc-600",
};
const TONE_CLS = {
  overdue: "text-rose-600",
  soon: "text-amber-600",
  ok: "text-zinc-500",
};

// deadline terdekat dulu; "YYYY-MM-DD" bisa dibanding sebagai string.
// Yang nggak ada deadline ditaruh paling belakang.
function byDeadline(a, b) {
  if (a.deadline && b.deadline) {
    if (a.deadline < b.deadline) return -1;
    if (a.deadline > b.deadline) return 1;
    return 0;
  }
  if (a.deadline) return -1;
  if (b.deadline) return 1;
  return 0;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const myId = profile?.id ?? null;
  const firstName = profile?.first_name || user.firstName;

  const [data, setData] = useState(null); // { tasks, subs, sa }
  const [status, setStatus] = useState("loading"); // loading | error | ready

  useEffect(() => {
    let alive = true;
    Promise.all([
      listTasks(),
      listSubtasks(),
      listSubtaskAssignees().catch(() => []),
    ])
      .then(([tasks, subs, sa]) => {
        if (!alive) return;
        setData({ tasks, subs, sa });
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

  // Task yang lagi "Dikerjakan" dan ada subtask yang di-assign ke aku.
  const myDoing = useMemo(() => {
    if (!data || !myId) return [];
    const mySubIds = new Set(
      data.sa.filter((r) => r.person_id === myId).map((r) => r.subtask_id)
    );
    const taskHasMine = new Set(
      data.subs.filter((s) => mySubIds.has(s.id)).map((s) => s.task_id)
    );
    const total = new Map();
    const done = new Map();
    for (const s of data.subs) {
      total.set(s.task_id, (total.get(s.task_id) ?? 0) + 1);
      if (s.done) done.set(s.task_id, (done.get(s.task_id) ?? 0) + 1);
    }
    return data.tasks
      .filter((t) => t.status === "doing" && taskHasMine.has(t.id))
      .map((t) => ({
        ...t,
        subTotal: total.get(t.id) ?? 0,
        subDone: done.get(t.id) ?? 0,
      }))
      .sort(byDeadline);
  }, [data, myId]);

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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight text-zinc-900">
            Lagi kamu kerjain
          </h2>
          <Link
            to="/task"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
          >
            Semua task <ArrowRight size={13} />
          </Link>
        </div>

        {status === "loading" ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-zinc-100"
              />
            ))}
          </div>
        ) : status === "error" ? (
          <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-10 text-center text-sm text-rose-500">
            Gagal memuat task.
          </p>
        ) : myDoing.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-400">
            Nggak ada task yang lagi kamu kerjain. 🎉
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {myDoing.map((t) => {
              const tone = deadlineTone(t.deadline, t.status);
              return (
                <Link
                  key={t.id}
                  to="/task"
                  className="flex items-start gap-3 rounded-xl border border-zinc-200/80 bg-white p-3.5 transition-shadow hover:shadow-sm"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      PRIO_CLS[t.priority] ?? PRIO_CLS.P2
                    }`}
                  >
                    {t.priority}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-zinc-900">
                      {t.title}
                    </p>
                    {t.subTotal > 0 && (
                      <p className="mt-0.5 text-xs text-zinc-400">
                        Subtask {t.subDone}/{t.subTotal}
                      </p>
                    )}
                  </div>
                  {t.deadline ? (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 text-xs ${
                        TONE_CLS[tone] ?? "text-zinc-500"
                      }`}
                      title={shortDate(t.deadline)}
                    >
                      <CalendarDays size={12} />
                      {deadlineLabel(t.deadline, t.status)}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-zinc-300">
                      tanpa deadline
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

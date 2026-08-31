import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Search, Settings2 } from "lucide-react";
import { listHyperlist } from "../lib/hyperlist";
import { useAuth } from "../context/auth-context";

const MAX_ROWS = 800;
const isHttp = (s) => /^https?:\/\//i.test(s);

export default function HyperlistPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState(null); // null = memuat
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");

  useEffect(() => {
    let alive = true;
    listHyperlist()
      .then((data) => {
        if (!alive) return;
        setRows(
          data.map((r) => ({
            ...r,
            topik: (r.topik ?? "").replace(/\s+/g, " "),
            subtopik: (r.subtopik ?? "").replace(/\s+/g, " "),
          }))
        );
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[hyperlist] gagal memuat:", err);
        setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const topics = useMemo(() => {
    if (!rows) return [];
    return Array.from(new Set(rows.map((r) => r.topik))).sort((a, b) =>
      a.localeCompare(b, "id")
    );
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (topic && r.topik !== topic) return false;
      if (!needle) return true;
      return (
        r.kode.toLowerCase().includes(needle) ||
        r.topik.toLowerCase().includes(needle) ||
        r.subtopik.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, topic]);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Hyperlist
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Katalog materi PDF LMS — cari berdasarkan kode, topik, atau
            subtopik.
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/admin/hyperlist"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Settings2 size={14} /> Kelola
          </Link>
        )}
      </div>

      {/* Kontrol */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kode / topik / subtopik…"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 sm:max-w-[280px]"
        >
          <option value="">Semua topik</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Gagal memuat data.
        </p>
      ) : !rows ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Memuat data…
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada materi.
        </p>
      ) : (
        <>
          <p className="text-xs text-zinc-400">
            {filtered.length.toLocaleString("id")} materi
            {filtered.length > MAX_ROWS
              ? ` · menampilkan ${MAX_ROWS} teratas, persempit pencarian`
              : ""}
          </p>

          <div className="scroll-slim overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Topik</th>
                  <th className="px-4 py-3">Subtopik</th>
                  <th className="px-4 py-3">PDF</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, MAX_ROWS).map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-zinc-100 align-top transition-colors hover:bg-zinc-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-500">
                      {r.kode}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {r.topik}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      {r.subtopik}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {isHttp(r.link) ? (
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
                        >
                          Buka <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400">
                          {r.link || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

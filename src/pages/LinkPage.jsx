import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Search, Settings2 } from "lucide-react";
import { listLinks } from "../lib/links";
import { useAuth } from "../context/auth-context";

const isHttp = (s) => /^https?:\/\//i.test(s);
const UNCAT = "Tanpa kategori";

export default function LinkPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState(null); // null = memuat
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    listLinks()
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[link] gagal memuat:", err);
        setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle) ||
        r.category.toLowerCase().includes(needle) ||
        r.url.toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const groups = useMemo(() => {
    const m = new Map();
    for (const r of filtered) {
      const key = r.category.trim() || UNCAT;
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(r);
    }
    return [...m.entries()].sort((a, b) => {
      if (a[0] === UNCAT) return 1;
      if (b[0] === UNCAT) return -1;
      return a[0].localeCompare(b[0], "id");
    });
  }, [filtered]);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Link</h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Kumpulan tautan penting — dikelompokkan per kategori.
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/admin/link"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Settings2 size={14} /> Kelola
          </Link>
        )}
      </div>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari judul / deskripsi / kategori…"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
        />
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
          Belum ada link.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Nggak ada link yang cocok.
        </p>
      ) : (
        <div className="flex flex-col gap-7">
          {groups.map(([cat, items]) => (
            <section key={cat} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {cat}
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                  {items.length}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((r) => (
                  <a
                    key={r.id}
                    href={isHttp(r.url) ? r.url : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex flex-col gap-1 rounded-2xl border border-zinc-200/80 bg-white p-4 transition-colors ${
                      isHttp(r.url)
                        ? "hover:border-brand-300 hover:bg-brand-50/40"
                        : "cursor-default"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900">
                        {r.title || r.url}
                      </p>
                      {isHttp(r.url) && (
                        <ExternalLink
                          size={14}
                          className="mt-0.5 shrink-0 text-zinc-300 transition-colors group-hover:text-brand-500"
                        />
                      )}
                    </div>
                    {r.description && (
                      <p className="text-xs leading-relaxed text-zinc-500">
                        {r.description}
                      </p>
                    )}
                    <p className="mt-1 truncate text-[11px] text-zinc-400">
                      {r.url}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

import { ChevronLeft, ChevronRight } from "lucide-react";

// Paginasi sederhana: Sebelumnya · Hal X dari Y · Berikutnya.
export default function Pagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null;
  const go = (p) => onChange(Math.min(pageCount, Math.max(1, p)));

  const btn =
    "inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40";

  return (
    <div className="flex items-center justify-between gap-3">
      <button onClick={() => go(page - 1)} disabled={page <= 1} className={btn}>
        <ChevronLeft size={14} /> Sebelumnya
      </button>
      <span className="text-xs text-zinc-500">
        Hal <span className="font-semibold text-zinc-900">{page}</span> dari{" "}
        {pageCount}
      </span>
      <button
        onClick={() => go(page + 1)}
        disabled={page >= pageCount}
        className={btn}
      >
        Berikutnya <ChevronRight size={14} />
      </button>
    </div>
  );
}

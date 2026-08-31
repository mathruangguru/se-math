// Placeholder halaman — dipakai sampai kontennya dibangun.
export default function PagePlaceholder({ title, subtitle }) {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{subtitle}</p>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
        <p className="text-sm font-semibold text-zinc-900">Belum ada konten</p>
        <p className="mt-1 text-xs text-zinc-500">
          Halaman {title} masih kosong.
        </p>
      </div>
    </div>
  );
}

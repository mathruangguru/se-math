// Avatar inisial dengan warna deterministik dari `id` (atau nama).
// name kosong → lingkaran putus-putus (belum ada assignee).

const COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-600",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
];

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name = "", id = "", size = 24, title }) {
  const dim = { width: size, height: size };

  if (!name) {
    return (
      <span
        className="inline-grid shrink-0 place-items-center rounded-full border border-dashed border-zinc-300 text-zinc-300"
        style={{ ...dim, fontSize: size * 0.5 }}
        title={title ?? "Belum ada assignee"}
        aria-hidden="true"
      >
        ·
      </span>
    );
  }

  const color = COLORS[hash(id || name) % COLORS.length];
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold leading-none text-white ${color}`}
      style={{ ...dim, fontSize: size * 0.4 }}
      title={title ?? name}
    >
      {initials(name)}
    </span>
  );
}

// Tumpukan avatar yang saling tumpang tindih + "+N" kalau kelebihan.
// people: [{ id, name }].
export function AvatarGroup({ people = [], size = 22, max = 4 }) {
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="inline-flex items-center" title={people.map((p) => p.name).join(", ")}>
      {shown.map((p, i) => (
        <span
          key={p.id ?? i}
          className="rounded-full ring-2 ring-white"
          style={{ marginLeft: i === 0 ? 0 : -(size * 0.3) }}
        >
          <Avatar name={p.name} id={p.id ?? p.name} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span className="ml-1 text-[11px] font-semibold text-zinc-400">
          +{rest}
        </span>
      )}
    </span>
  );
}

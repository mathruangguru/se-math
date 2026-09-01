import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../context/auth-context";
import {
  listMembers,
  addMember,
  setMemberRole,
  removeMember,
} from "../../lib/members";

const fieldCls =
  "h-10 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-brand-500";

function fullName(u) {
  return (
    [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.id
  );
}

export default function UsersAdminPage() {
  const { session } = useAuth();
  const myId = session?.user?.id ?? null;

  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [q, setQ] = useState("");
  const [rowBusyId, setRowBusyId] = useState(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  async function fetchRows() {
    try {
      const data = await listMembers();
      setRows(data);
      setStatus("ready");
    } catch (err) {
      console.error("[admin/users] gagal memuat:", err);
      setStatus("error");
    }
  }

  useEffect(() => {
    let alive = true;
    listMembers()
      .then((data) => {
        if (!alive) return;
        setRows(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[admin/users] gagal memuat:", err);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(needle) ||
        fullName(u).toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!email.trim()) return;
    setAdding(true);
    try {
      await addMember(email, role);
      setEmail("");
      setRole("member");
      await fetchRows();
      setMsg({ ok: true, text: "User ditambahkan." });
    } catch (err) {
      setMsg({ ok: false, text: err?.message ?? "Gagal menambah user." });
    } finally {
      setAdding(false);
    }
  };

  const handleRole = async (u, next) => {
    setRowBusyId(u.id);
    try {
      await setMemberRole(u.id, next);
      setRows((prev) =>
        prev.map((r) => (r.id === u.id ? { ...r, role: next } : r))
      );
    } catch (err) {
      window.alert(`Gagal ganti role: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
    }
  };

  const handleRemove = async (u) => {
    if (!window.confirm(`Cabut akses ${u.email ?? fullName(u)}?`)) return;
    setRowBusyId(u.id);
    try {
      await removeMember(u.id);
      setRows((prev) => prev.filter((r) => r.id !== u.id));
    } catch (err) {
      window.alert(`Gagal menghapus: ${err?.message ?? err}`);
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      <div>
        <Link
          to="/hyperlist"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800"
        >
          <ArrowLeft size={14} /> Hyperlist
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-zinc-900">
          Pengguna
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          User yang boleh masuk Subject Excellence Matematika. Email harus sudah
          punya akun Supabase / coaching-math.
        </p>
      </div>

      {/* Tambah */}
      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-5 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-xs font-medium text-zinc-600">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="orang@ruangguru.com"
            className={`mt-1 w-full ${fieldCls}`}
          />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={`mt-1 block ${fieldCls}`}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          <Plus size={14} strokeWidth={2.6} /> {adding ? "Menambah…" : "Tambah"}
        </button>
      </form>

      {msg && (
        <p
          className={`text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}
        >
          {msg.text}
        </p>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari…"
        className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white sm:max-w-xs"
      />

      {status === "loading" ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : status === "error" ? (
        <p className="rounded-2xl border border-dashed border-rose-300 bg-white px-6 py-12 text-center text-sm text-rose-500">
          Gagal memuat data.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-400">
          Belum ada user. Tambah lewat form di atas.
        </p>
      ) : (
        <div className="scroll-slim overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const isSelf = u.id === myId;
                return (
                  <tr
                    key={u.id}
                    className="border-t border-zinc-100 transition-colors hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      {fullName(u)}
                      {isSelf && (
                        <span className="ml-1.5 text-xs font-normal text-zinc-400">
                          (kamu)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={isSelf || rowBusyId === u.id}
                        onChange={(e) => handleRole(u, e.target.value)}
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none focus:border-brand-500 disabled:opacity-50"
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => handleRemove(u)}
                          disabled={rowBusyId === u.id}
                          className="inline-grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                          aria-label="Cabut akses"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

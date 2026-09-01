import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListChecks,
  ListTree,
  Link2,
  Shield,
  Users,
  LogOut,
  X,
} from "lucide-react";
import ruangguruLogo from "../../assets/ruangguru.png";
import { user } from "../../data/user";
import { useAuth } from "../../context/auth-context";
import { signOut } from "../../lib/auth";

const mainNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/task", label: "Task", icon: ListChecks },
  { to: "/hyperlist", label: "Hyperlist", icon: ListTree },
  { to: "/link", label: "Link", icon: Link2 },
];

const adminNav = [
  { to: "/admin/hyperlist", label: "Kelola Hyperlist", icon: Shield },
  { to: "/admin/link", label: "Kelola Link", icon: Link2 },
  { to: "/admin/users", label: "Pengguna", icon: Users },
];

function navItemClass({ isActive }) {
  return [
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  ].join(" ");
}

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user.name;
  const email = profile?.email || user.email;

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      onClose();
      navigate("/login", { replace: true });
    }
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[264px] shrink-0 flex-col border-r border-zinc-200/70 bg-white px-5 py-6 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Tombol tutup — mobile only */}
      <button
        onClick={onClose}
        aria-label="Tutup menu"
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 lg:hidden"
      >
        <X size={18} />
      </button>

      {/* Brand */}
      <div className="flex items-center gap-3 px-1">
        <img
          src={ruangguruLogo}
          alt="Ruangguru"
          className="h-10 w-auto shrink-0"
        />
        <p className="text-xs font-extrabold uppercase leading-tight tracking-wide text-zinc-900">
          Subject Excellence Matematika
        </p>
      </div>

      {/* Main nav */}
      <nav className="mt-8 flex flex-col gap-1">
        {mainNav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose} className={navItemClass}>
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.4 : 2}
                  className={isActive ? "text-white" : "text-zinc-400"}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <p className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Admin
            </p>
            {adminNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={navItemClass}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.4 : 2}
                      className={isActive ? "text-white" : "text-zinc-400"}
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User + sign out */}
      <div className="mt-auto flex flex-col gap-2 border-t border-zinc-200/70 pt-4">
        <div className="px-3">
          <p className="truncate text-sm font-semibold text-zinc-800">{name}</p>
          <p className="truncate text-xs text-zinc-400" title={email}>
            {email}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <LogOut size={18} strokeWidth={2} className="text-zinc-400" />
          Keluar
        </button>
      </div>
    </aside>
  );
}

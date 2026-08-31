import { NavLink } from "react-router-dom";
import { LayoutDashboard, ListChecks, ListTree, LogOut, X } from "lucide-react";
import ruangguruLogo from "../../assets/ruangguru.png";
import { user } from "../../data/user";

const mainNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/task", label: "Task", icon: ListChecks },
  { to: "/hyperlist", label: "Hyperlist", icon: ListTree },
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
      <div className="flex flex-col items-center gap-2.5 px-1 text-center">
        <img src={ruangguruLogo} alt="Ruangguru" className="h-8 w-auto" />
        <p className="text-base font-extrabold uppercase tracking-wide text-zinc-900">
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
      </nav>

      {/* User + sign out */}
      <div className="mt-auto flex flex-col gap-2 border-t border-zinc-200/70 pt-4">
        <div className="px-3">
          <p className="truncate text-sm font-semibold text-zinc-800">
            {user.name}
          </p>
          <p className="truncate text-xs text-zinc-400">{user.email}</p>
        </div>
        <button className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
          <LogOut size={18} strokeWidth={2} className="text-zinc-400" />
          Keluar
        </button>
      </div>
    </aside>
  );
}

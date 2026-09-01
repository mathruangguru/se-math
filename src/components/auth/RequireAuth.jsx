import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { signOut } from "../../lib/auth";
import BootSplash from "../layout/BootSplash";

export default function RequireAuth() {
  const { session, isMember, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) return <BootSplash />;

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Login ke Supabase tapi belum terdaftar di se-math (belum ada se_profile).
  if (!isMember) {
    const handleSignOut = async () => {
      try {
        await signOut();
      } finally {
        navigate("/login", { replace: true });
      }
    };
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f4f5] px-6">
        <div className="max-w-sm text-center">
          <p className="text-sm font-semibold text-zinc-900">
            Akun belum terdaftar
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Akun ini belum punya akses ke Subject Excellence Matematika. Minta
            admin menambahkanmu.
          </p>
          <button
            onClick={handleSignOut}
            className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

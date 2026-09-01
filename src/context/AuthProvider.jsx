import { useCallback, useEffect, useState } from "react";
import { supabase, hasSupabase } from "../lib/supabase";
import { AuthContext } from "./auth-context";

// se-math numpang auth (auth.users) coaching-math, tapi role/user-nya
// sendiri di `se_profile`. User yang login tapi belum punya baris
// se_profile = `isMember` false -> nggak boleh masuk app.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  // Sudah selesai cek session awal? (kalau Supabase mati, nggak ada yang dicek)
  const [sessionChecked, setSessionChecked] = useState(!hasSupabase);
  const [profile, setProfile] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);

  // Ikuti perubahan session (login / logout / refresh token).
  useEffect(() => {
    if (!hasSupabase) return;

    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setSessionChecked(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!alive) return;
      setSession(next);
      setSessionChecked(true);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id ?? null;

  // Panggil refreshProfile() buat re-fetch.
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshProfile = useCallback(() => setRefreshTick((n) => n + 1), []);

  // Ambil profile tiap kali user berganti / diminta refresh.
  useEffect(() => {
    if (!hasSupabase || !userId) return;

    let alive = true;
    supabase
      .from("se_profile")
      .select("id, email, first_name, last_name, role")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.error("[auth] gagal ambil profil:", error);
        setProfile(data ?? null);
        setProfileUserId(userId);
      });

    return () => {
      alive = false;
    };
  }, [userId, refreshTick]);

  // Fetch profile-nya sudah kelar buat user yang sekarang?
  const profileFetched = userId !== null && profileUserId === userId;
  const activeProfile = profileFetched ? profile : null;

  const value = {
    session,
    profile: activeProfile,
    loading:
      hasSupabase && (!sessionChecked || (userId !== null && !profileFetched)),
    // Login + punya baris se_profile.
    isMember: Boolean(activeProfile),
    isAdmin: activeProfile?.role === "admin",
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

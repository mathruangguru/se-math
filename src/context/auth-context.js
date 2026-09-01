import { createContext, useContext } from "react";

/**
 * { session, profile, loading, isMember, isAdmin, refreshProfile }
 * isMember = login + punya baris di `se_profile`.
 * isAdmin  = isMember && role === "admin".
 * Di-provide oleh <AuthProvider> (src/context/AuthProvider.jsx).
 */
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}

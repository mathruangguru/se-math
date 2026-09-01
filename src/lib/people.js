import { supabase, hasSupabase } from "./supabase";

const P_COLS = "id, first_name, last_name, email";

/**
 * Daftar orang se-math (buat assignee, dsb). RLS `se_profile select member`
 * bikin ini kebaca semua member, bukan admin doang. Tanpa Supabase → [].
 */
export async function listPeople() {
  if (!hasSupabase) return [];
  const { data, error } = await supabase
    .from("se_profile")
    .select(P_COLS)
    .order("first_name", { nullsFirst: false })
    .order("email");
  if (error) throw error;
  return data ?? [];
}

/** "Rohmat Setiawan" / fallback ke email / "". */
export function personName(p) {
  if (!p) return "";
  const n = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return n || p.email || "";
}

/** Nama depan aja, buat label ringkas. */
export function personShort(p) {
  const n = personName(p);
  return n ? n.split(/\s+/)[0] : "";
}

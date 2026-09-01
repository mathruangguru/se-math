import { supabase, hasSupabase } from "./supabase";

const COLS = "id, email, first_name, last_name, role, created_at";

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

/** Semua user se-math (RLS: admin baca semua). */
export async function listMembers() {
  ensure();
  const { data, error } = await supabase
    .from("se_profile")
    .select(COLS)
    .order("created_at");
  if (error) throw error;
  return data;
}

/**
 * Tambah user dari email (harus sudah punya akun Supabase / coaching-math).
 * Lewat RPC se_add_member (SECURITY DEFINER, cek admin di dalamnya).
 */
export async function addMember(email, role = "member") {
  ensure();
  const { data, error } = await supabase.rpc("se_add_member", {
    p_email: email.trim(),
    p_role: role,
  });
  if (error) throw error;
  return data;
}

export async function setMemberRole(id, role) {
  ensure();
  const { error } = await supabase
    .from("se_profile")
    .update({ role })
    .eq("id", id);
  if (error) throw error;
}

export async function removeMember(id) {
  ensure();
  const { error } = await supabase.from("se_profile").delete().eq("id", id);
  if (error) throw error;
}

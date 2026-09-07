import { supabase, hasSupabase } from "./supabase";

const L_COLS = "id, person_id, kind, start_date, end_date, note";
const PAGE = 1000;
const KINDS = ["cuti", "sakit", "izin", "lainnya"];

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function clean(row) {
  const a = row.start_date;
  const b = row.end_date || a;
  return {
    person_id: row.person_id,
    kind: KINDS.includes(row.kind) ? row.kind : "cuti",
    start_date: a <= b ? a : b,
    end_date: a <= b ? b : a,
    note: (row.note ?? "").trim(),
  };
}

/**
 * Cuti/izin yang overlap rentang [from, to] inklusif ("YYYY-MM-DD").
 * Kebaca semua yang login (RLS `se_leave read`).
 */
export async function listLeaves({ from, to } = {}) {
  ensure();
  const out = [];
  for (let i = 0; ; i += PAGE) {
    let q = supabase
      .from("se_leave")
      .select(L_COLS)
      .order("start_date")
      .range(i, i + PAGE - 1);
    if (to) q = q.lte("start_date", to);
    if (from) q = q.gte("end_date", from);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export async function createLeave(row) {
  ensure();
  const { data, error } = await supabase
    .from("se_leave")
    .insert(clean(row))
    .select(L_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateLeave(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_leave")
    .update({ ...clean(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(L_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLeave(id) {
  ensure();
  const { error } = await supabase.from("se_leave").delete().eq("id", id);
  if (error) throw error;
}

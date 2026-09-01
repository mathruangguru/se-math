import { supabase, hasSupabase } from "./supabase";

const J_COLS = "id, front, back, created_by";
const PAGE = 1000;

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function clean(row) {
  return {
    front: (row.front ?? "").trim(),
    back: (row.back ?? "").trim(),
  };
}

export async function listJokes() {
  ensure();
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("se_joke")
      .select(J_COLS)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

/** created_by wajib = user sekarang (dicek juga di RLS). */
export async function createJoke(row, createdBy) {
  ensure();
  const { data, error } = await supabase
    .from("se_joke")
    .insert({ ...clean(row), created_by: createdBy })
    .select(J_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateJoke(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_joke")
    .update({ ...clean(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(J_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteJoke(id) {
  ensure();
  const { error } = await supabase.from("se_joke").delete().eq("id", id);
  if (error) throw error;
}

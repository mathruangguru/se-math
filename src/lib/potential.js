import { supabase, hasSupabase } from "./supabase";

const P_COLS = "id, title, detail, eta, created_by, created_at";
const PAGE = 1000;

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function clean(row) {
  return {
    title: (row.title ?? "").trim(),
    detail: (row.detail ?? "").trim(),
    eta: (row.eta ?? "").trim(),
  };
}

/** Watch-list kerjaan potensial, terbaru dulu. Kebaca semua yang login. */
export async function listPotentialWork() {
  ensure();
  const out = [];
  for (let i = 0; ; i += PAGE) {
    const { data, error } = await supabase
      .from("se_potential_work")
      .select(P_COLS)
      .order("created_at", { ascending: false })
      .range(i, i + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export async function createPotentialWork(row, createdBy) {
  ensure();
  const { data, error } = await supabase
    .from("se_potential_work")
    .insert({ ...clean(row), created_by: createdBy })
    .select(P_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePotentialWork(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_potential_work")
    .update({ ...clean(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(P_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deletePotentialWork(id) {
  ensure();
  const { error } = await supabase
    .from("se_potential_work")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

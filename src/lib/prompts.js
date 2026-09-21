import { supabase, hasSupabase } from "./supabase";

const COLS = "id, title, prompt, category, tool, note, created_by, created_at";
const PAGE = 1000;

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function clean(row) {
  return {
    title: (row.title ?? "").trim(),
    prompt: (row.prompt ?? "").trim(),
    category: (row.category ?? "").trim(),
    tool: (row.tool ?? "").trim(),
    note: (row.note ?? "").trim(),
  };
}

export async function listPrompts() {
  ensure();
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("se_prompt")
      .select(COLS)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

/** created_by wajib = user sekarang (dicek juga di RLS). */
export async function createPrompt(row, createdBy) {
  ensure();
  const { data, error } = await supabase
    .from("se_prompt")
    .insert({ ...clean(row), created_by: createdBy })
    .select(COLS)
    .single();
  if (error) throw error;
  return data;
}

/** Semua member boleh ubah prompt siapa aja; created_by dikunci trigger. */
export async function updatePrompt(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_prompt")
    .update({ ...clean(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLS)
    .single();
  if (error) throw error;
  return data;
}

/** Cuma punya sendiri atau admin (dicek di RLS). */
export async function deletePrompt(id) {
  ensure();
  const { error } = await supabase.from("se_prompt").delete().eq("id", id);
  if (error) throw error;
}

import { supabase, hasSupabase } from "./supabase";

const L_COLS = "id, title, url, description, category";
const PAGE = 1000;

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function clean(row) {
  return {
    title: (row.title ?? "").trim(),
    url: (row.url ?? "").trim(),
    description: (row.description ?? "").trim(),
    category: (row.category ?? "").trim(),
  };
}

export async function listLinks() {
  ensure();
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("se_link")
      .select(L_COLS)
      .order("category")
      .order("title")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export async function createLink(row) {
  ensure();
  const { data, error } = await supabase
    .from("se_link")
    .insert(clean(row))
    .select(L_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateLink(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_link")
    .update({ ...clean(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(L_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLink(id) {
  ensure();
  const { error } = await supabase.from("se_link").delete().eq("id", id);
  if (error) throw error;
}

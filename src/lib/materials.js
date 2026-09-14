import { supabase, hasSupabase } from "./supabase";

const COLS = "id, title, content, link, created_by, created_at";
const PAGE = 1000;

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function clean(row) {
  return {
    title: (row.title ?? "").trim(),
    content: row.content ?? "",
    link: (row.link ?? "").trim(),
  };
}

/** Bahan ajar B2B (markdown + link opsional), terbaru dulu. Kebaca semua
 * yang login. Katalog berdiri sendiri — nggak terikat ke project. */
export async function listMaterials() {
  ensure();
  const out = [];
  for (let i = 0; ; i += PAGE) {
    const { data, error } = await supabase
      .from("se_b2b_material")
      .select(COLS)
      .order("created_at", { ascending: false })
      .range(i, i + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export async function createMaterial(row, createdBy) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_material")
    .insert({ ...clean(row), created_by: createdBy })
    .select(COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateMaterial(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_material")
    .update({ ...clean(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMaterial(id) {
  ensure();
  const { error } = await supabase.from("se_b2b_material").delete().eq("id", id);
  if (error) throw error;
}

export async function getMaterial(id) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_material")
    .select(COLS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

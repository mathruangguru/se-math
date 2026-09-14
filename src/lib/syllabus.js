import { supabase, hasSupabase } from "./supabase";

const COLS = "id, title, content, created_by, created_at";
const PAGE = 1000;

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function clean(row) {
  return {
    title: (row.title ?? "").trim(),
    content: row.content ?? "",
  };
}

/** Template silabus (markdown), terbaru dulu. Kebaca semua yang login. */
export async function listSyllabusTemplates() {
  ensure();
  const out = [];
  for (let i = 0; ; i += PAGE) {
    const { data, error } = await supabase
      .from("se_syllabus")
      .select(COLS)
      .order("created_at", { ascending: false })
      .range(i, i + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export async function createSyllabusTemplate(row, createdBy) {
  ensure();
  const { data, error } = await supabase
    .from("se_syllabus")
    .insert({ ...clean(row), created_by: createdBy })
    .select(COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSyllabusTemplate(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_syllabus")
    .update({ ...clean(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSyllabusTemplate(id) {
  ensure();
  const { error } = await supabase.from("se_syllabus").delete().eq("id", id);
  if (error) throw error;
}

export async function getSyllabusTemplate(id) {
  ensure();
  const { data, error } = await supabase
    .from("se_syllabus")
    .select(COLS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

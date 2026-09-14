import { supabase, hasSupabase } from "./supabase";

const PROJECT_COLS =
  "id, client_name, package, status, start_date, note, syllabus, created_by, created_at";
const PAGE = 1000;

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function cleanProject(row) {
  return {
    client_name: (row.client_name ?? "").trim(),
    package: (row.package ?? "").trim(),
    status: ["berjalan", "selesai", "batal"].includes(row.status)
      ? row.status
      : "berjalan",
    start_date: row.start_date ? row.start_date : null,
    note: (row.note ?? "").trim(),
  };
}

export async function listB2bProjects() {
  ensure();
  const out = [];
  for (let i = 0; ; i += PAGE) {
    const { data, error } = await supabase
      .from("se_b2b_project")
      .select(PROJECT_COLS)
      .order("created_at", { ascending: false })
      .range(i, i + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export async function createB2bProject(row, createdBy) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_project")
    .insert({ ...cleanProject(row), created_by: createdBy })
    .select(PROJECT_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateB2bProject(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_project")
    .update({ ...cleanProject(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(PROJECT_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteB2bProject(id) {
  ensure();
  const { error } = await supabase.from("se_b2b_project").delete().eq("id", id);
  if (error) throw error;
}

export async function getB2bProject(id) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_project")
    .select(PROJECT_COLS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/** Silabus project = teks markdown, diedit langsung atau di-insert dari
 * template (lihat src/lib/syllabus.js). */
export async function updateProjectSyllabus(id, content) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_project")
    .update({ syllabus: content ?? "", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(PROJECT_COLS)
    .single();
  if (error) throw error;
  return data;
}

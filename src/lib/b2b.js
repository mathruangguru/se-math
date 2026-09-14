import { supabase, hasSupabase } from "./supabase";

const PROJECT_COLS =
  "id, client_name, package, category, status, start_date, note, syllabus, created_by, created_at";
const PAGE = 1000;

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function cleanProject(row) {
  return {
    client_name: (row.client_name ?? "").trim(),
    package: (row.package ?? "").trim(),
    category: (row.category ?? "").trim(),
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

// ── Milestone (checkpoint progress project) ─────────────────────────
// Admin doang yang kelola (tambah/ubah/hapus/centang tercapai).

const MILESTONE_COLS = "id, project_id, title, target_date, done, created_at";

function cleanMilestone(row) {
  return {
    title: (row.title ?? "").trim(),
    target_date: row.target_date ? row.target_date : null,
    done: !!row.done,
  };
}

export async function listMilestones(projectId) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_milestone")
    .select(MILESTONE_COLS)
    .eq("project_id", projectId)
    .order("target_date", { nullsFirst: false })
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function createMilestone(projectId, row) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_milestone")
    .insert({ ...cleanMilestone(row), project_id: projectId })
    .select(MILESTONE_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateMilestone(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_milestone")
    .update({ ...cleanMilestone(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(MILESTONE_COLS)
    .single();
  if (error) throw error;
  return data;
}

/** Centang / uncentang tercapai doang — admin. */
export async function setMilestoneDone(id, done) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_milestone")
    .update({ done, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(MILESTONE_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMilestone(id) {
  ensure();
  const { error } = await supabase
    .from("se_b2b_milestone")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Tanggal penting (label + tanggal, tanpa status tercapai) ────────
// Admin doang yang kelola.

const IMPORTANT_DATE_COLS = "id, project_id, label, date_value, note, created_at";

function cleanImportantDate(row) {
  return {
    label: (row.label ?? "").trim(),
    date_value: row.date_value || new Date().toISOString().slice(0, 10),
    note: (row.note ?? "").trim(),
  };
}

export async function listImportantDates(projectId) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_important_date")
    .select(IMPORTANT_DATE_COLS)
    .eq("project_id", projectId)
    .order("date_value");
  if (error) throw error;
  return data;
}

export async function createImportantDate(projectId, row) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_important_date")
    .insert({ ...cleanImportantDate(row), project_id: projectId })
    .select(IMPORTANT_DATE_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateImportantDate(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_important_date")
    .update({ ...cleanImportantDate(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(IMPORTANT_DATE_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteImportantDate(id) {
  ensure();
  const { error } = await supabase
    .from("se_b2b_important_date")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

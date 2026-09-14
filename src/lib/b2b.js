import { supabase, hasSupabase } from "./supabase";

const PROJECT_COLS =
  "id, client_name, package, status, start_date, note, created_by, created_at";
const SYLLABUS_COLS = "id, project_id, position, topic, detail, done";
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

function cleanSyllabus(row) {
  return {
    topic: (row.topic ?? "").trim(),
    detail: (row.detail ?? "").trim(),
  };
}

// ── Project ───────────────────────────────────────────────────────

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

// ── Silabus (per project) ────────────────────────────────────────

export async function listB2bSyllabus(projectId) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_syllabus")
    .select(SYLLABUS_COLS)
    .eq("project_id", projectId)
    .order("position")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function createSyllabusItem(projectId, row, position) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_syllabus")
    .insert({ ...cleanSyllabus(row), project_id: projectId, position })
    .select(SYLLABUS_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSyllabusItem(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_syllabus")
    .update({ ...cleanSyllabus(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SYLLABUS_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSyllabusItem(id) {
  ensure();
  const { error } = await supabase
    .from("se_b2b_syllabus")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Tuker `position` dua item (buat naik/turunin urutan). */
export async function swapSyllabusPosition(a, b) {
  ensure();
  const [ra, rb] = await Promise.all([
    supabase
      .from("se_b2b_syllabus")
      .update({ position: b.position })
      .eq("id", a.id)
      .select(SYLLABUS_COLS)
      .single(),
    supabase
      .from("se_b2b_syllabus")
      .update({ position: a.position })
      .eq("id", b.id)
      .select(SYLLABUS_COLS)
      .single(),
  ]);
  if (ra.error) throw ra.error;
  if (rb.error) throw rb.error;
  return [ra.data, rb.data];
}

/** Centang / uncentang — boleh member biasa. */
export async function setSyllabusDone(id, done) {
  ensure();
  const { data, error } = await supabase.rpc("se_b2b_syllabus_set_done", {
    p_id: id,
    p_done: done,
  });
  if (error) throw error;
  return data;
}

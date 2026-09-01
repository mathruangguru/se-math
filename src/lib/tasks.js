import { supabase, hasSupabase } from "./supabase";

const T_COLS =
  "id, title, description, priority, status, deadline, assignee_id";
const PAGE = 1000;

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function clean(row) {
  return {
    title: (row.title ?? "").trim(),
    description: (row.description ?? "").trim(),
    priority: row.priority ?? "P2",
    status: row.status ?? "todo",
    deadline: row.deadline ? row.deadline : null,
    assignee_id: row.assignee_id ? row.assignee_id : null,
  };
}

// Ambil semua task (lewati batas 1000 baris per request).
async function selectAll() {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("se_task")
      .select(T_COLS)
      .order("priority")
      .order("deadline", { nullsFirst: false })
      .order("created_at")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export async function listTasks() {
  ensure();
  return selectAll();
}

export async function createTask(row) {
  ensure();
  const { data, error } = await supabase
    .from("se_task")
    .insert(clean(row))
    .select(T_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_task")
    .update({ ...clean(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(T_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id) {
  ensure();
  const { error } = await supabase.from("se_task").delete().eq("id", id);
  if (error) throw error;
}

/** Ubah status saja — boleh dipanggil member biasa (RPC SECURITY DEFINER). */
export async function setTaskStatus(id, status) {
  ensure();
  const { data, error } = await supabase.rpc("se_task_set_status", {
    p_id: id,
    p_status: status,
  });
  if (error) throw error;
  return data;
}

/** Ubah assignee saja — boleh member biasa. assigneeId null = lepas. */
export async function setTaskAssignee(id, assigneeId) {
  ensure();
  const { data, error } = await supabase.rpc("se_task_set_assignee", {
    p_id: id,
    p_assignee: assigneeId || null,
  });
  if (error) throw error;
  return data;
}

// ── Subtask (checklist per task) ────────────────────────────────────

const ST_COLS = "id, task_id, title, done";

/** Semua subtask (semua task) — di-group per task_id di UI. */
export async function listSubtasks() {
  ensure();
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("se_subtask")
      .select(ST_COLS)
      .order("created_at")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export async function createSubtask(taskId, title) {
  ensure();
  const { data, error } = await supabase
    .from("se_subtask")
    .insert({ task_id: taskId, title: title.trim() })
    .select(ST_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function renameSubtask(id, title) {
  ensure();
  const { data, error } = await supabase
    .from("se_subtask")
    .update({ title: title.trim() })
    .eq("id", id)
    .select(ST_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubtask(id) {
  ensure();
  const { error } = await supabase.from("se_subtask").delete().eq("id", id);
  if (error) throw error;
}

/** Centang / uncentang — boleh member biasa. */
export async function setSubtaskDone(id, done) {
  ensure();
  const { data, error } = await supabase.rpc("se_subtask_set_done", {
    p_id: id,
    p_done: done,
  });
  if (error) throw error;
  return data;
}

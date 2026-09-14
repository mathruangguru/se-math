import { supabase, hasSupabase } from "./supabase";

const COLS =
  "id, topic, qty, question_type, status, deadline, note, created_by, created_at";
const PAGE = 1000;

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function clean(row) {
  const qty = Number(row.qty);
  return {
    topic: (row.topic ?? "").trim(),
    qty: Number.isFinite(qty) && qty > 0 ? Math.round(qty) : 0,
    question_type: (row.question_type ?? "").trim(),
    status: ["belum", "proses", "selesai"].includes(row.status)
      ? row.status
      : "belum",
    deadline: row.deadline ? row.deadline : null,
    note: (row.note ?? "").trim(),
  };
}

/** Kebutuhan soal B2B — list umum, nggak terikat project. Tabel bareng:
 * semua yang login lihat, semua member isi/edit/hapus. */
export async function listQuestionNeeds() {
  ensure();
  const out = [];
  for (let i = 0; ; i += PAGE) {
    const { data, error } = await supabase
      .from("se_b2b_question_need")
      .select(COLS)
      .order("created_at", { ascending: false })
      .range(i, i + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export async function createQuestionNeed(row, createdBy) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_question_need")
    .insert({ ...clean(row), created_by: createdBy })
    .select(COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuestionNeed(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_b2b_question_need")
    .update({ ...clean(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteQuestionNeed(id) {
  ensure();
  const { error } = await supabase
    .from("se_b2b_question_need")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

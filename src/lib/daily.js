import { supabase, hasSupabase } from "./supabase";

const D_COLS =
  "id, person_id, report_date, activity, category, alloc_value, alloc_unit";
const PAGE = 1000;

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function clean(row) {
  const v = row.alloc_value;
  return {
    report_date: row.report_date,
    activity: (row.activity ?? "").trim(),
    category: (row.category ?? "").trim(),
    alloc_value: v === "" || v === null || v === undefined ? null : Number(v),
    alloc_unit: row.alloc_unit === "persen" ? "persen" : "jam",
  };
}

/**
 * Entri laporan harian dalam rentang tanggal (inklusif, "YYYY-MM-DD").
 * RLS: member cuma dapat punya sendiri, admin dapat semua.
 */
export async function listDailyReports({ from, to } = {}) {
  ensure();
  const out = [];
  for (let i = 0; ; i += PAGE) {
    let query = supabase
      .from("se_daily_report")
      .select(D_COLS)
      .order("report_date", { ascending: false })
      .order("created_at")
      .range(i, i + PAGE - 1);
    if (from) query = query.gte("report_date", from);
    if (to) query = query.lte("report_date", to);
    const { data, error } = await query;
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

/** person_id wajib = user sekarang (dicek juga di RLS). */
export async function createDailyReport(row, personId) {
  ensure();
  const { data, error } = await supabase
    .from("se_daily_report")
    .insert({ ...clean(row), person_id: personId })
    .select(D_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateDailyReport(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_daily_report")
    .update({ ...clean(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(D_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDailyReport(id) {
  ensure();
  const { error } = await supabase
    .from("se_daily_report")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

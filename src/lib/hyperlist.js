import { supabase, hasSupabase } from "./supabase";
import { parseTsv } from "./parseTsv";

const HL_COLS = "id, kode, topik, subtopik, link";
const INSERT_CHUNK = 500;
const DELETE_CHUNK = 200;
// PostgREST membatasi jumlah baris per request (default 1000) — paginate.
const PAGE = 1000;

function ensure() {
  if (!hasSupabase) throw new Error("Supabase belum dikonfigurasi.");
}

function clean(row) {
  return {
    kode: (row.kode ?? "").trim(),
    topik: (row.topik ?? "").trim(),
    subtopik: (row.subtopik ?? "").trim(),
    link: (row.link ?? "").trim(),
  };
}

// Ambil semua baris se_hyperlist (lewati batas 1000 per request).
async function selectAll(cols) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("se_hyperlist")
      .select(cols)
      .order("topik")
      .order("kode")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

function parseTsvRows(text) {
  return parseTsv(text)
    .filter(
      (f) => f.length >= 4 && f[0] && f[0].trim().toUpperCase() !== "KODE"
    )
    .map((f) => ({
      kode: f[0].trim(),
      topik: f[1].trim().replace(/\s+/g, " "),
      subtopik: f[2].trim().replace(/\s+/g, " "),
      link: f[3].trim(),
    }));
}

/**
 * Semua materi. Bentuk: { id, kode, topik, subtopik, link }[]
 * Tanpa env Supabase -> fallback baca public/hyperlist.tsv.
 */
export async function listHyperlist() {
  if (!hasSupabase) {
    const res = await fetch(`${import.meta.env.BASE_URL}hyperlist.tsv`);
    if (!res.ok) throw new Error(`hyperlist.tsv: ${res.status}`);
    const text = await res.text();
    return parseTsvRows(text).map((r, i) => ({ id: `tsv-${i}`, ...r }));
  }
  return selectAll(HL_COLS);
}

export async function createHyperlistEntry(row) {
  ensure();
  const { data, error } = await supabase
    .from("se_hyperlist")
    .insert(clean(row))
    .select(HL_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateHyperlistEntry(id, patch) {
  ensure();
  const { data, error } = await supabase
    .from("se_hyperlist")
    .update({ ...clean(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(HL_COLS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHyperlistEntry(id) {
  ensure();
  const { error } = await supabase.from("se_hyperlist").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Impor banyak baris sekaligus. rows = { kode, topik, subtopik, link }[].
 * Plain INSERT — kode kembar tetap masuk semua (nggak upsert / nggak dedup).
 * replaceAll = ganti seluruh isi tabel. Baris baru di-insert DULU, baru
 * baris lama dihapus — jadi kalau salah satu langkah gagal, tabel nggak
 * pernah kosong atau separuh. Mengembalikan jumlah baris masuk.
 */
export async function bulkCreateHyperlist(rows, { replaceAll = false } = {}) {
  ensure();
  const payload = rows.map(clean).filter((r) => r.kode || r.subtopik || r.link);

  let oldIds = [];
  if (replaceAll) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("se_hyperlist")
        .select("id")
        .order("id")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      oldIds.push(...data.map((r) => r.id));
      if (data.length < PAGE) break;
    }
  }

  for (let i = 0; i < payload.length; i += INSERT_CHUNK) {
    const { error } = await supabase
      .from("se_hyperlist")
      .insert(payload.slice(i, i + INSERT_CHUNK));
    if (error) throw error;
  }

  for (let i = 0; i < oldIds.length; i += DELETE_CHUNK) {
    const { error } = await supabase
      .from("se_hyperlist")
      .delete()
      .in("id", oldIds.slice(i, i + DELETE_CHUNK));
    if (error) throw error;
  }

  return payload.length;
}

/**
 * Parse teks TSV tempelan (format sama dengan public/hyperlist.tsv:
 * KODE \t TOPIK \t SUBTOPIK \t LINK). Buang baris header & baris kosong.
 */
export function parseHyperlistTsv(text) {
  return parseTsvRows(text);
}

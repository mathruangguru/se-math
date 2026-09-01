import { supabase, hasSupabase } from "./supabase";
import { parseTsv } from "./parseTsv";

const HL_COLS = "id, kode, topik, subtopik, link";
const CHUNK = 500;

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

/**
 * Semua materi. Bentuk: { id, kode, topik, subtopik, link }[]
 * Tanpa env Supabase -> fallback baca public/hyperlist.tsv.
 */
export async function listHyperlist() {
  if (!hasSupabase) {
    const res = await fetch(`${import.meta.env.BASE_URL}hyperlist.tsv`);
    if (!res.ok) throw new Error(`hyperlist.tsv: ${res.status}`);
    const text = await res.text();
    return parseTsv(text)
      .filter(
        (f) => f.length >= 4 && f[0] && f[0].trim().toUpperCase() !== "KODE"
      )
      .map((f, i) => ({
        id: `tsv-${i}`,
        kode: f[0].trim(),
        topik: f[1].trim().replace(/\s+/g, " "),
        subtopik: f[2].trim().replace(/\s+/g, " "),
        link: f[3].trim(),
      }));
  }

  const { data, error } = await supabase
    .from("se_hyperlist")
    .select(HL_COLS)
    .order("topik")
    .order("kode");
  if (error) throw error;
  return data;
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
 * replaceAll = kosongkan tabel dulu. Mengembalikan jumlah baris masuk.
 */
export async function bulkCreateHyperlist(rows, { replaceAll = false } = {}) {
  ensure();
  const payload = rows.map(clean).filter((r) => r.kode || r.subtopik || r.link);

  if (replaceAll) {
    const { error } = await supabase
      .from("se_hyperlist")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw error;
  }

  for (let i = 0; i < payload.length; i += CHUNK) {
    const { error } = await supabase
      .from("se_hyperlist")
      .insert(payload.slice(i, i + CHUNK));
    if (error) throw error;
  }
  return payload.length;
}

/**
 * Parse teks TSV tempelan (format sama dengan public/hyperlist.tsv:
 * KODE \t TOPIK \t SUBTOPIK \t LINK). Buang baris header & baris kosong.
 */
export function parseHyperlistTsv(text) {
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

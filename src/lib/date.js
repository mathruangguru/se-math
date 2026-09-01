// "Selamat Pagi/Siang/Sore/Malam" berdasarkan jam sekarang.
export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 11) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 19) return "Selamat Sore";
  return "Selamat Malam";
}

// Contoh: "Sabtu, 29 Agustus"
export function longDate(date = new Date()) {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Contoh: "12 Sep". Terima "YYYY-MM-DD" atau Date.
export function shortDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

// Nada deadline buat pewarnaan: "overdue" | "soon" | "ok" | null.
// null kalau nggak ada deadline atau task sudah selesai. "soon" = <= 3 hari.
export function deadlineTone(dateStr, status) {
  if (!dateStr || status === "done") return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "ok";
}

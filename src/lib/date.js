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

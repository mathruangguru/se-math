// Parser TSV yang menghormati field ber-tanda-kutip: sebuah field yang dibuka
// dengan " boleh memuat newline dan tab, dan "" berarti satu karakter kutip.
// Mengembalikan array baris, tiap baris berupa array string.
export function parseTsv(text) {
  const rows = [];
  let field = "";
  let record = [];
  let inQuotes = false;
  let dirty = false;

  const endField = () => {
    record.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    if (!(record.length === 1 && record[0] === "")) rows.push(record);
    record = [];
    dirty = false;
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      dirty = true;
    } else if (c === "\t") {
      endField();
      dirty = true;
    } else if (c === "\n") {
      endRecord();
    } else if (c !== "\r") {
      field += c;
      dirty = true;
    }
  }

  if (dirty || record.length) endRecord();
  return rows;
}

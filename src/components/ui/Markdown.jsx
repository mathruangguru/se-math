// Renderer markdown minimal — headers (#/##/###), list (-/*/1.), tabel
// (| a | b |), bold (**x**), italic (*x*), paragraf. Semua jadi elemen
// React biasa (bukan dangerouslySetInnerHTML), jadi aman dari HTML/script
// nyelip di teks. Nggak lengkap kayak markdown beneran, tapi cukup buat
// dokumen silabus.

function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isSeparatorRow(line) {
  if (!isTableRow(line)) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function parseBlocks(text) {
  const lines = (text ?? "").split("\n");
  const blocks = [];
  let list = null; // { type: "ul" | "ol", items: [] }
  let para = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join(" ") });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (!line.trim()) {
      flushPara();
      flushList();
      i += 1;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      flushPara();
      flushList();
      const header = splitRow(line);
      i += 2; // lewatin header + baris pemisah
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara();
      flushList();
      blocks.push({ type: `h${h[1].length}`, text: h[2] });
      i += 1;
      continue;
    }

    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      flushPara();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(ul[1]);
      i += 1;
      continue;
    }

    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (ol) {
      flushPara();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(ol[1]);
      i += 1;
      continue;
    }

    flushList();
    para.push(line.trim());
    i += 1;
  }
  flushPara();
  flushList();
  return blocks;
}

const H_CLS = {
  h1: "mt-4 text-base font-bold text-zinc-900 first:mt-0",
  h2: "mt-3 text-sm font-bold text-zinc-900 first:mt-0",
  h3: "mt-2.5 text-sm font-semibold text-zinc-800 first:mt-0",
};

export default function Markdown({ text, className = "" }) {
  const blocks = parseBlocks(text);
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((b, i) => {
        if (b.type === "h1" || b.type === "h2" || b.type === "h3") {
          const Tag = b.type;
          return (
            <Tag key={i} className={H_CLS[b.type]}>
              {renderInline(b.text, i)}
            </Tag>
          );
        }
        if (b.type === "ul") {
          return (
            <ul
              key={i}
              className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm leading-relaxed text-zinc-700 first:mt-0"
            >
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol
              key={i}
              className="mt-1.5 list-decimal space-y-0.5 pl-5 text-sm leading-relaxed text-zinc-700 first:mt-0"
            >
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        if (b.type === "table") {
          return (
            <div key={i} className="scroll-slim mt-2 overflow-x-auto first:mt-0">
              <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-zinc-50">
                    {b.header.map((c, j) => (
                      <th
                        key={j}
                        className="border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-600"
                      >
                        {renderInline(c, `${i}-h${j}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, ri) => (
                    <tr key={ri} className="border-t border-zinc-100">
                      {r.map((c, ci) => (
                        <td
                          key={ci}
                          className="border border-zinc-200 px-2.5 py-1.5 align-top text-zinc-700"
                        >
                          {renderInline(c, `${i}-${ri}-${ci}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={i} className="mt-1.5 text-sm leading-relaxed text-zinc-700 first:mt-0">
            {renderInline(b.text, i)}
          </p>
        );
      })}
    </div>
  );
}

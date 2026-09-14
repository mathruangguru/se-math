// Renderer markdown minimal — headers (#/##/###), list (-/*/1., termasuk
// checklist [ ]/[x]), tabel (| a | b |), blockquote (> x), horizontal rule
// (---), kode inline (`x`) & blok (```), link ([x](url)), bold (**x**),
// italic (*x*), coret (~~x~~), LaTeX ($x$ inline / $$x$$ display, lewat
// KaTeX), paragraf. Semua jadi elemen React biasa (bukan
// dangerouslySetInnerHTML, kecuali output KaTeX sendiri yang tepercaya),
// jadi aman dari HTML/script nyelip di teks. Nggak lengkap kayak markdown
// beneran, tapi cukup buat dokumen silabus.

import katex from "katex";

const SAFE_URL_RE = /^(https?:|mailto:)/i;

const INLINE_RE =
  /(`[^`]+`|\$\$[^$]*\$\$|\$[^$]+\$|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Fallback (KaTeX gagal total) di-escape manual — biar tetep aman biarpun
// nggak lewat elemen React biasa.
function katexHtml(src, displayMode) {
  try {
    return katex.renderToString(src, {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return escapeHtml(src);
  }
}

function renderInline(text, keyPrefix) {
  const parts = text.split(INLINE_RE);
  return parts.map((part, i) => {
    if (!part) return null;
    const key = `${keyPrefix}-${i}`;

    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={key}
          className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("$$") && part.endsWith("$$") && part.length >= 4) {
      return (
        <span
          key={key}
          dangerouslySetInnerHTML={{ __html: katexHtml(part.slice(2, -2), true) }}
        />
      );
    }
    if (part.startsWith("$") && part.endsWith("$") && part.length >= 2) {
      return (
        <span
          key={key}
          dangerouslySetInnerHTML={{ __html: katexHtml(part.slice(1, -1), false) }}
        />
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("~~") && part.endsWith("~~")) {
      return <del key={key}>{part.slice(2, -2)}</del>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const url = link[2].trim();
      if (SAFE_URL_RE.test(url)) {
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 underline underline-offset-2"
          >
            {link[1]}
          </a>
        );
      }
      return part;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
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
  let quote = null; // string[]

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
  const flushQuote = () => {
    if (quote) {
      blocks.push({ type: "blockquote", lines: quote });
      quote = null;
    }
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (!line.trim()) {
      flushAll();
      i += 1;
      continue;
    }

    if (/^```/.test(line.trim())) {
      flushAll();
      i += 1;
      const codeLines = [];
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // lewatin baris penutup ```
      blocks.push({ type: "code", text: codeLines.join("\n") });
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      flushAll();
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

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
      flushAll();
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushAll();
      blocks.push({ type: `h${h[1].length}`, text: h[2] });
      i += 1;
      continue;
    }

    const bq = line.match(/^>\s?(.*)$/);
    if (bq) {
      flushPara();
      flushList();
      if (!quote) quote = [];
      quote.push(bq[1]);
      i += 1;
      continue;
    }

    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      flushPara();
      flushQuote();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      const task = ul[1].match(/^\[([ xX])\]\s+(.*)$/);
      list.items.push(
        task ? { text: task[2], checked: task[1].toLowerCase() === "x" } : { text: ul[1], checked: null },
      );
      i += 1;
      continue;
    }

    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (ol) {
      flushPara();
      flushQuote();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push({ text: ol[1], checked: null });
      i += 1;
      continue;
    }

    flushList();
    flushQuote();
    para.push(line.trim());
    i += 1;
  }
  flushAll();
  return blocks;
}

const H_CLS = {
  h1: "mt-4 text-base font-bold text-zinc-900 first:mt-0",
  h2: "mt-3 text-sm font-bold text-zinc-900 first:mt-0",
  h3: "mt-2.5 text-sm font-semibold text-zinc-800 first:mt-0",
};

function ListItems({ items, blockIdx }) {
  return items.map((it, j) => (
    <li
      key={j}
      className={it.checked !== null ? "flex list-none items-start gap-2 -ml-5" : undefined}
    >
      {it.checked !== null && (
        <input
          type="checkbox"
          checked={it.checked}
          disabled
          className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-zinc-300"
        />
      )}
      <span className={it.checked ? "text-zinc-400 line-through" : undefined}>
        {renderInline(it.text, `${blockIdx}-${j}`)}
      </span>
    </li>
  ));
}

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
              <ListItems items={b.items} blockIdx={i} />
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol
              key={i}
              className="mt-1.5 list-decimal space-y-0.5 pl-5 text-sm leading-relaxed text-zinc-700 first:mt-0"
            >
              <ListItems items={b.items} blockIdx={i} />
            </ol>
          );
        }
        if (b.type === "blockquote") {
          return (
            <blockquote
              key={i}
              className="mt-2 border-l-2 border-zinc-300 pl-3 text-sm italic leading-relaxed text-zinc-500 first:mt-0"
            >
              {b.lines.map((l, j) => (
                <p key={j} className={j > 0 ? "mt-1" : undefined}>
                  {renderInline(l, `${i}-${j}`)}
                </p>
              ))}
            </blockquote>
          );
        }
        if (b.type === "hr") {
          return <hr key={i} className="my-3 border-zinc-200" />;
        }
        if (b.type === "code") {
          return (
            <pre
              key={i}
              className="scroll-slim mt-2 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-100 first:mt-0"
            >
              <code>{b.text}</code>
            </pre>
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

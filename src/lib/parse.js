import { isObj } from "./json-shape.js";

/** Duplicate keys collapse inside JSON.parse, so the raw text has to be scanned. */
export function findDuplicateKeys(text) {
  const dupes = [];
  const stack = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      let str = "";
      i += 1;
      while (i < text.length) {
        if (text[i] === "\\") { str += text[i] + text[i + 1]; i += 2; continue; }
        if (text[i] === '"') { i += 1; break; }
        str += text[i++];
      }
      let j = i;
      while (j < text.length && /\s/.test(text[j])) j += 1;
      const top = stack[stack.length - 1];
      if (text[j] === ":" && top) {
        if (top.has(str) && !dupes.includes(str)) dupes.push(str);
        top.add(str);
      }
      continue;
    }
    if (c === "{") stack.push(new Set());
    else if (c === "[") stack.push(null);
    else if (c === "}" || c === "]") stack.pop();
    i += 1;
  }
  return dupes;
}

/** JavaScript sorts integer-like keys first, so the output order would not match. */
export function findNumericKeyRisk(root) {
  const hits = [];
  (function walk(node, path) {
    if (Array.isArray(node)) return node.forEach((x, i) => walk(x, path + "[" + i + "]"));
    if (!isObj(node)) return;
    const keys = Object.keys(node);
    if (keys.length > 1 && keys.some(k => /^(0|[1-9]\d*)$/.test(k))) hits.push(path || "root");
    keys.forEach(k => walk(node[k], path ? path + "." + k : k));
  })(root, "");
  return hits;
}

const CAUSES = [
  [/[“”‘’]/, "Curly quotes (“ ”) are not valid JSON — replace them with straight \" quotes."],
  [/,\s*[}\]]/, "There is a trailing comma before a closing bracket."],
  [/\/\/|\/\*/, "JSON does not allow // or /* */ comments."],
  [/[{,]\s*[A-Za-z_$][\w$]*\s*:/, "Property names have to be wrapped in double quotes."],
];

function diagnose(text, error) {
  const hints = [];
  CAUSES.forEach(([re, hint]) => { if (re.test(text)) hints.push(hint); });
  if (/'/.test(text) && !/"/.test(text)) hints.push("JSON strings need double quotes, not single quotes.");

  let snippet = "";
  const at = /position (\d+)/.exec(error.message);
  if (at) {
    const pos = Number(at[1]);
    const before = text.slice(0, pos);
    const line = before.split("\n").length;
    const col = pos - (before.lastIndexOf("\n") + 1);
    const lineText = text.split("\n")[line - 1] || "";
    const from = Math.max(0, col - 40);
    snippet =
      "line " + line + ", column " + (col + 1) + "\n" +
      lineText.slice(from, col + 40) + "\n" +
      " ".repeat(col - from) + "^";
  }
  return { hints, snippet };
}

/**
 * The single entry point for turning pasted text into a document.
 * Never throws: returns either { data, notices } or { error }.
 */
export function parseSource(input) {
  const hadBOM = input.charCodeAt(0) === 0xfeff;
  const text = input.replace(/^﻿/, "").trim();

  if (!text) return { error: { message: "Paste some JSON first.", hints: [], snippet: "" } };

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    const d = diagnose(text, e);
    if (hadBOM) d.hints.unshift("The text starts with an invisible byte-order mark (U+FEFF).");
    return { error: { message: e.message, ...d } };
  }

  if (!isObj(data) && !Array.isArray(data)) {
    return { error: { message: "Expected an object or array at the top level.", hints: [], snippet: "" } };
  }

  const notices = [];
  if (hadBOM) notices.push("Removed an invisible byte-order mark (U+FEFF) from the start of the text.");

  const dupes = findDuplicateKeys(text);
  if (dupes.length) {
    notices.push(
      "Duplicate keys in the source — only the last value of " +
        dupes.map(d => '"' + d + '"').join(", ") +
        " survived. The rest are already lost."
    );
  }

  const numeric = findNumericKeyRisk(data);
  if (numeric.length) {
    notices.push(
      "Number-like keys at " + numeric.slice(0, 3).join(", ") +
        " — JavaScript sorts those first, so the output order will differ from what you pasted."
    );
  }

  return { data, notices };
}

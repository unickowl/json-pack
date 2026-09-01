import { isI18n, isObj } from "./json-shape.js";

/**
 * Only flags characters the eye cannot see. Curly quotes are deliberately absent:
 * they are invalid in JSON *syntax* but perfectly legitimate inside copy, so
 * flagging them would fire on every well-typeset string.
 */
const FLAGS = [
  [/^\s|\s$/, "leading or trailing whitespace"],
  [/\u00A0/, "a non-breaking space (U+00A0)"],
  [/[\u200B-\u200D\uFEFF]/, "a zero-width character"],
  [/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/, "a control character"],
];

export const formatIssues = value =>
  typeof value === "string" ? FLAGS.filter(([re]) => re.test(value)).map(([, label]) => label) : [];

export function documentStats(root, locales) {
  let fields = 0, written = 0, total = 0, flagged = 0, strings = 0;
  (function walk(node) {
    if (typeof node === "string") {
      strings += 1;
      if (formatIssues(node).length) flagged += 1;
      return;
    }
    if (isI18n(node)) {
      fields += 1;
      locales.forEach(l => {
        total += 1;
        if (node[l]) written += 1;
      });
      Object.values(node).forEach(walk);
      return;
    }
    if (Array.isArray(node)) node.forEach(walk);
    else if (isObj(node)) Object.values(node).forEach(walk);
  })(root);
  return { fields, written, total, flagged, strings };
}

/** Per-locale completeness for the structure rail: filled dot or hollow dot. */
export function completeness(node, locales) {
  const out = Object.fromEntries(locales.map(l => [l, true]));
  (function walk(n) {
    if (isI18n(n)) locales.forEach(l => { if (!n[l]) out[l] = false; });
    else if (Array.isArray(n)) n.forEach(walk);
    else if (isObj(n)) Object.values(n).forEach(walk);
  })(node);
  return out;
}

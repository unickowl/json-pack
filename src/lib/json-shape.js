// Shape detection and safe construction for the documents this tool edits.
// Everything here is pure: no DOM, no React.

export const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);

const LOCALE_KEY = /^[a-z]{2}([_-][a-z]{2,4})?$/i;
export const isLocaleKey = k => LOCALE_KEY.test(k);

/** An i18n leaf: every key is a locale code and every value is a string. */
export const isI18n = v =>
  isObj(v) &&
  Object.keys(v).length > 0 &&
  Object.keys(v).every(isLocaleKey) &&
  Object.values(v).every(x => typeof x === "string");

export const isItemArray = v => Array.isArray(v) && v.length > 0 && v.every(isObj);

export const humanize = k => k.replace(/[_-]+/g, " ").replace(/^\w/, c => c.toUpperCase());

export const kindOf = v => (v === null ? "null" : typeof v);

/**
 * A number edited to "61" has to come back as 61, not "61".
 * Falls back to the raw text when it no longer fits the original type, so the
 * user sees what they typed instead of having it silently discarded.
 */
export function coerce(text, kind) {
  const t = text.trim();
  if (kind === "number") {
    const n = Number(t);
    return t !== "" && Number.isFinite(n) ? n : text;
  }
  if (kind === "boolean") {
    if (t === "true") return true;
    if (t === "false") return false;
    return text;
  }
  if (kind === "null") return t === "" || t === "null" ? null : text;
  return text;
}

/** Field shape of an array, captured once so added items always match. */
export function readShape(arr) {
  const shape = [];
  arr.forEach(item => {
    if (!isObj(item)) return;
    Object.keys(item).forEach(key => {
      if (shape.some(f => f.key === key)) return;
      const v = item[key];
      shape.push({
        key,
        kind: isI18n(v) ? "i18n" : Array.isArray(v) ? "array" : isObj(v) ? "object" : "scalar",
      });
    });
  });
  return shape;
}

/**
 * defineProperty rather than assignment: a field literally named __proto__ has
 * to stay an own property instead of being swallowed by the inherited setter.
 */
const put = (target, key, value) =>
  Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });

export function blankItem(shape, locales) {
  const out = {};
  shape.forEach(f => {
    if (f.kind === "i18n") {
      const leaf = {};
      locales.forEach(l => put(leaf, l, ""));
      put(out, f.key, leaf);
    } else if (f.kind === "array") put(out, f.key, []);
    else if (f.kind === "object") put(out, f.key, {});
    else put(out, f.key, "");
  });
  return out;
}

/** Every array's field shape, keyed by the array's path, captured at parse time. */
export function collectShapes(root) {
  const shapes = new Map();
  (function walk(node, path) {
    if (Array.isArray(node)) {
      if (isItemArray(node)) shapes.set(path, readShape(node));
      node.forEach((item, i) => walk(item, path + "[" + i + "]"));
      return;
    }
    if (!isObj(node)) return;
    Object.keys(node).forEach(k => walk(node[k], path ? path + "." + k : k));
  })(root, "");
  return shapes;
}

/** Original type of every leaf, so an edit can say "number → string". */
export function collectKinds(root) {
  const kinds = new Map();
  (function walk(node, path) {
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, path + "[" + i + "]"));
    if (isObj(node)) return Object.keys(node).forEach(k => walk(node[k], path ? path + "." + k : k));
    kinds.set(path, kindOf(node));
  })(root, "");
  return kinds;
}

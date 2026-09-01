import { isI18n, isObj } from "./json-shape.js";

/** "content[0].tags" — the same key format collectShapes() uses. */
export const pathKey = path =>
  path.reduce((acc, seg) => (typeof seg === "number" ? acc + "[" + seg + "]" : acc ? acc + "." + seg : String(seg)), "");

/**
 * Flattens a document into a list of row descriptors.
 * Recurses all the way down, so nothing is ever silently skipped: a nested
 * object contributes its own fields with a dotted label, and a nested array
 * gets its own band.
 */
export function buildRows(node, path = [], labelPrefix = []) {
  const rows = [];
  if (!isObj(node)) return rows;

  Object.keys(node).forEach(key => {
    const value = node[key];
    const nextPath = [...path, key];
    const label = [...labelPrefix, key];

    if (isI18n(value)) {
      rows.push({ type: "field", key: pathKey(nextPath), path: nextPath, label });
    } else if (Array.isArray(value)) {
      rows.push(...buildArrayRows(value, nextPath, key, label));
    } else if (isObj(value)) {
      rows.push(...buildRows(value, nextPath, label));
    } else {
      rows.push({ type: "scalar", key: pathKey(nextPath), path: nextPath, label });
    }
  });

  return rows;
}

/**
 * Decided per element, not per array: an array of objects gets a strip plus its
 * own fields, an array of strings gets one editable row each, and a mixed array
 * gets the right treatment for both. Dispatching per array would send an object
 * down the scalar path, where String(value) turns it into "[object Object]".
 */
function buildArrayRows(arr, path, name, label) {
  const base = pathKey(path);
  const rows = [{ type: "band", key: base + ":band", path, name, count: arr.length }];

  if (arr.length === 0) {
    rows.push({ type: "add", key: base + ":add", path, empty: true });
    return rows;
  }

  arr.forEach((item, index) => {
    const itemPath = [...path, index];
    if (isObj(item)) {
      rows.push({ type: "strip", key: base + "[" + index + "]", path, index, total: arr.length });
      rows.push(...buildRows(item, itemPath));
    } else if (Array.isArray(item)) {
      rows.push(...buildArrayRows(item, itemPath, name + " " + (index + 1), [...label, String(index + 1)]));
    } else {
      rows.push({
        type: "listitem",
        key: base + "[" + index + "]",
        path,
        index,
        total: arr.length,
        label: [...label, String(index + 1)],
      });
    }
  });

  rows.push({ type: "add", key: base + ":add", path, empty: false });
  return rows;
}

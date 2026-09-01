import { isI18n, isObj, isItemArray } from "./json-shape.js";

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

function buildArrayRows(arr, path, name, label) {
  const base = pathKey(path);
  const rows = [{ type: "band", key: base + ":band", path, name, count: arr.length }];

  if (arr.length === 0) {
    rows.push({ type: "add", key: base + ":add", path, empty: true });
    return rows;
  }

  const objectItems = isItemArray(arr);
  arr.forEach((item, index) => {
    if (objectItems) {
      rows.push({ type: "strip", key: base + "[" + index + "]", path, index, total: arr.length });
      rows.push(...buildRows(item, [...path, index]));
    } else {
      rows.push({
        type: "scalar",
        key: base + "[" + index + "]",
        path: [...path, index],
        label: [...label, String(index + 1)],
      });
    }
  });

  if (objectItems) rows.push({ type: "add", key: base + ":add", path, empty: false });
  return rows;
}

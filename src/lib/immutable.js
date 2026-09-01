/**
 * Structural-sharing updates. Untouched branches keep their identity, which is
 * what lets React.memo skip every row the user did not just type into.
 */
const shallow = node => {
  if (Array.isArray(node)) return node.slice();
  // preserve own keys exactly, including one literally named __proto__
  const out = {};
  Object.keys(node).forEach(k =>
    Object.defineProperty(out, k, { value: node[k], writable: true, enumerable: true, configurable: true })
  );
  return out;
};

export function setIn(root, path, value) {
  if (!path.length) return value;
  const [head, ...rest] = path;
  const next = shallow(root);
  const child = rest.length ? setIn(root[head], rest, value) : value;
  if (Array.isArray(next)) next[head] = child;
  else Object.defineProperty(next, head, { value: child, writable: true, enumerable: true, configurable: true });
  return next;
}

export const updateIn = (root, path, fn) => setIn(root, path, fn(getIn(root, path)));

export function getIn(root, path) {
  return path.reduce((node, key) => (node == null ? node : node[key]), root);
}

export const arrayInsert = (arr, index, item) => [...arr.slice(0, index), item, ...arr.slice(index)];
export const arrayRemove = (arr, index) => arr.filter((_, i) => i !== index);
export function arrayMove(arr, from, to) {
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

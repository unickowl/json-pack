/**
 * Tokenises pretty-printed JSON so the preview can be rendered as React
 * elements. No innerHTML anywhere, so there is no escaping to get wrong.
 */
const TOKEN = /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

export function tokenizeJson(text) {
  const out = [];
  let last = 0;
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), cls: null });
    if (m[1]) out.push({ text: m[1], cls: "jk" });
    else if (m[2]) out.push({ text: m[2], cls: "js" });
    else if (m[3]) out.push({ text: m[3], cls: "jl" });
    else out.push({ text: m[4], cls: "jn" });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), cls: null });
  return out;
}

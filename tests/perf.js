
// Types N keystrokes into a large document. Emits #PERF only if it really ran,
// so the harness can tell a real measurement from a page that never executed.
const wait = ms => new Promise(r => setTimeout(r, ms));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function type(el, value) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
const click = el => el.dispatchEvent(new MouseEvent("click", { bubbles: true }));

(async () => {
  const t0 = Date.now();
  while (!$(".cm-content") && Date.now() - t0 < 8000) await wait(50);
  if (!$(".cm-content")) return;

  const N = Number(new URLSearchParams(location.search).get("n") || 400);
  const big = { content: Array.from({ length: N }, (_, i) => ({
    title: { en: "Item " + i, zh_tw: "測試", ja: "力口" },
    paragraph_1: { en: "x".repeat(200), zh_tw: "測試", ja: "力口" },
    paragraph_2: { en: "y".repeat(200), zh_tw: "測試", ja: "力口" } })) };

  const content = $(".cm-content");
  content.focus();
  document.execCommand("selectAll");
  const data = new DataTransfer();
  data.setData("text/plain", JSON.stringify(big));
  content.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  await wait(200);
  click([...$$(".btn--fill")].find(b => b.textContent.includes("Build")));
  await wait(500);

  const KEYS = Number(location.hash.slice(1) || 0);
  const ta = $$(".row--field textarea")[0];
  if (!ta) return;
  for (let i = 0; i < KEYS; i++) type(ta, "z".repeat((i % 40) + 1));
  await wait(250);

  const pre = document.createElement("pre");
  pre.id = "PERF";
  pre.textContent = "items=" + N + " textareas=" + $$("textarea").length + " keys=" + KEYS + " rawOpen=" + !!$(".raw.is-open");
  document.body.appendChild(pre);
})();

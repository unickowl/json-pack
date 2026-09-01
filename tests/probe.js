
// Drives the built app through a browser and reports to a #PROBE block.
const log = [];
const ok = b => (b ? "PASS" : "**FAIL**");
const wait = ms => new Promise(r => setTimeout(r, ms));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const until = async (fn, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return true; await wait(50); }
  return false;
};

// React tracks input values itself; a plain .value assignment is invisible to it.
function type(el, value) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
const click = el => el.dispatchEvent(new MouseEvent("click", { bubbles: true }));

async function restart() { const b = $(".btn--quiet"); if (b) { click(b); await wait(80); } }
async function paste(text) {
  if (!$("#source")) await restart();
  type($("#source"), text);
  await wait(30);
  click([...$$(".btn--fill")].find(b => b.textContent.includes("Build")));
  await wait(150);
}
async function output() {
  if (!$(".raw.is-open")) click([...$$(".btn--line")].find(b => b.textContent.includes("Raw")));
  await wait(340);
  return $(".raw pre").textContent;
}

(async () => {
 try {
  const mounted = await until(() => $("#source"));
  log.push("0  app mounted                : " + ok(mounted));
  if (!mounted) throw new Error("app never mounted");

  const NBSP = String.fromCharCode(0xA0), ZWSP = String.fromCharCode(0x200B), BOM = String.fromCharCode(0xFEFF), CTRL = String.fromCharCode(1);

  const nasty = { section_title: { en: 'He said: "hi" \\ back\\slash /slash', zh_tw: "line1\nline2\ttabbed", ja: "rocket \u{1D546} nbsp" + NBSP + "x zwsp" + ZWSP + "y" },
                  smart: { en: "“Smart quotes” — dash", zh_tw: "（全形）：「引號」", ja: "ctrl" + CTRL + "char" } };
  const src = JSON.stringify(nasty, null, 4);
  await paste(src);
  const got = await output();
  log.push("1  round trip byte-exact     : " + ok(got === src));
  if (got !== src) for (let i = 0; i < Math.max(got.length, src.length); i++) if (got[i] !== src[i]) { log.push("     diff @" + i + " got=" + JSON.stringify(got.slice(i-25,i+25)) + " want=" + JSON.stringify(src.slice(i-25,i+25))); break; }

  const typed = 'say "hello" \\ and “smart”';
  type($$(".row--field textarea")[0], typed);
  await wait(80);
  let parsed = null, perr = null;
  try { parsed = JSON.parse(await output()); } catch (e) { perr = e.message; }
  log.push("2  typed quotes stay valid   : " + ok(!perr) + " | exact value=" + ok(parsed && parsed.section_title.en === typed));

  await restart();
  await paste('{"title":{"en":"t","zh_tw":"","ja":""},"count":60,"flag":true,"nothing":null}');
  const scalars = $$(".lane--wide textarea");
  type(scalars[0], "61"); await wait(60);
  type(scalars[1], "false"); await wait(60);
  let doc = JSON.parse(await output());
  log.push("3  number stays number       : " + JSON.stringify(doc.count) + " " + ok(typeof doc.count === "number"));
  log.push("3  boolean stays boolean     : " + JSON.stringify(doc.flag) + " " + ok(typeof doc.flag === "boolean"));
  log.push("3  null preserved            : " + JSON.stringify(doc.nothing) + " " + ok(doc.nothing === null));
  type(scalars[0], "61abc"); await wait(80);
  log.push("3  bad number warns in label : " + ok($$(".k.is-changed").length > 0) + " label=" + JSON.stringify(($(".k.is-changed")||{textContent:""}).textContent));

  await restart();
  await paste(JSON.stringify({ content: [{ title: { en: "a", zh_tw: "", ja: "" }, paragraph_1: { en: "b", zh_tw: "", ja: "" }, paragraph_2: { en: "c", zh_tw: "", ja: "" } }] }, null, 4));
  let guard = 0;
  while ($(".row--strip") && guard++ < 8) { click($$(".row--strip .tool")[3]); await wait(70); }
  log.push("4  deleted to empty state    : " + ok(!!$(".row--empty")));
  click($(".row--empty .add")); await wait(90);
  click($(".row--add .add")); await wait(90);
  doc = JSON.parse(await output());
  log.push("4  shape kept after re-add   : " + ok(doc.content.length === 2 && JSON.stringify(Object.keys(doc.content[0])) === '["title","paragraph_1","paragraph_2"]') +
    " keys=" + JSON.stringify(Object.keys(doc.content[0])) + " locales=" + JSON.stringify(Object.keys(doc.content[0].title)));

  await restart();
  await paste('{"content":[{"title":{"en":"first","zh_tw":"","ja":""}},{"title":{"en":"second","zh_tw":"","ja":""}}]}');
  click($$(".row--strip")[1].querySelectorAll(".tool")[0]); await wait(90);
  doc = JSON.parse(await output());
  log.push("5  move up reorders          : " + ok(doc.content[0].title.en === "second") + " order=" + doc.content.map(c => c.title.en).join(","));

  await restart();
  await paste('{"section_title":{"en":"first","en":"second","zh_tw":"","ja":""}}');
  log.push("6  duplicate key notice      : " + ok($$(".notice").length > 0));
  await restart();
  await paste(BOM + '{"a":{"en":"x","zh_tw":"","ja":""}}');
  log.push("6  BOM stripped + noted      : " + ok($$(".notice").length > 0));
  await restart();
  await paste('{“a”: {“en”: “x”},}');
  log.push("6  diagnostics on bad paste  : " + ok($$(".errbox li").length > 0) +
    " hints=" + JSON.stringify($$(".errbox li").map(li => li.textContent.slice(0, 42))));

  await restart();
  const imgs0 = $$("img").length;
  await paste('{"<img src=x onerror=window.__x1=1>":{"en":"k","zh_tw":"","ja":""},"section_title":{"en":"</span><img src=y onerror=window.__x2=1>","zh_tw":"<svg onload=window.__x3=1></svg>","ja":"z"}}');
  await output();
  log.push("7  no injection              : newImgs=" + ($$("img").length - imgs0) +
    " flags=" + [1,2,3].map(i => window["__x" + i] ? "FIRED" : "0").join(",") +
    " " + ok($$("img").length === imgs0 && !window.__x1 && !window.__x2 && !window.__x3));
  log.push("7  prototype clean           : " + ok(({}).en === undefined && ({}).constructor === Object));

  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("DENIED")) } });
  click([...$$(".btn--fill")].find(b => b.textContent.includes("Copy")));
  await wait(500);
  log.push("8  copy failure is honest    : " + ok(!!$(".toast.is-bad.is-up") && !$(".btn--fill.is-done")) +
    ' toast="' + ($(".toast span")||{textContent:""}).textContent + '"');
 } catch (e) { log.push("SUITE THREW: " + e.message + "\n" + (e.stack||"").split("\n")[1]); }

 const pre = document.createElement("pre");
 pre.id = "PROBE";
 pre.textContent = log.join("\n");
 document.body.appendChild(pre);
})();

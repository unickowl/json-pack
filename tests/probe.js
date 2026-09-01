
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

  // ── footnotes: an array of localised values, side by side ───────────────
  await restart();
  click($(".link"));                                    // Load the example
  await wait(120);
  click([...$$(".btn--fill")].find(b => b.textContent.includes("Build")));
  await wait(220);
  let sample = JSON.parse(await output());
  const DEFAULT_FOOTNOTE = "*Represents the annualized gross transaction value associated with active clients, calculated using the median of company-provided low and high estimates. It does not represent OwlTing's recognized revenue or realized processed volume.";
  log.push("9  footnotes default present : " + ok(Array.isArray(sample.footnotes) && sample.footnotes.length === 1));
  log.push("9  default is localised      : " + ok(sample.footnotes[0] && typeof sample.footnotes[0] === "object" &&
    JSON.stringify(Object.keys(sample.footnotes[0])) === '["en","zh_tw","ja"]') +
    " keys=" + JSON.stringify(Object.keys(sample.footnotes[0] || {})));
  log.push("9  default en byte-exact     : " + ok(sample.footnotes[0].en === DEFAULT_FOOTNOTE));

  const footRows = () => $$(".row--localised");
  log.push("9  one row, lanes not stacked: rows=" + footRows().length +
    " lanes=" + (footRows()[0] ? footRows()[0].querySelectorAll("textarea").length : 0) +
    " " + ok(footRows().length === 1 && footRows()[0].querySelectorAll("textarea").length === 3));
  log.push("9  band says localised       : " + ok(($$(".row--band").find(b =>
    b.querySelector("h2").textContent.trim().toLowerCase() === "footnotes") || {textContent:""})
    .textContent.includes("localised text")));
  log.push("9  path label readable       : " + JSON.stringify(footRows()[0].querySelector(".c1 .k").textContent) +
    " " + ok(footRows()[0].querySelector(".c1 .k").textContent === "footnotes[0]"));

  // the empty locales offer the English text as a reference placeholder
  const lanesOf = row => [...row.querySelectorAll("textarea")];
  log.push("9  empty locale shows en ref : " + ok(lanesOf(footRows()[0])[1].placeholder === DEFAULT_FOOTNOTE));

  // translate into zh_tw
  type(lanesOf(footRows()[0])[1], "＊代表與活躍客戶相關的年化交易總額。"); await wait(100);
  sample = JSON.parse(await output());
  log.push("9  zh_tw written to leaf     : " + ok(sample.footnotes[0].zh_tw === "＊代表與活躍客戶相關的年化交易總額。" && sample.footnotes[0].en === DEFAULT_FOOTNOTE));

  // add two more, and check they arrive localised rather than as bare strings
  const addFor = name => {
    const band = $$(".row--band").find(b => b.querySelector("h2").textContent.trim().toLowerCase() === name);
    let n = band;
    while ((n = n.nextElementSibling)) {
      if (n.classList.contains("row--add") || n.classList.contains("row--empty")) return n.querySelector(".add");
      if (n.classList.contains("row--band")) break;
    }
    return null;
  };
  const footAdd = () => addFor("footnotes");
  click(footAdd()); await wait(100);
  click(footAdd()); await wait(100);
  sample = JSON.parse(await output());
  log.push("9  add appends i18n objects  : " + ok(sample.footnotes.length === 3 &&
    sample.footnotes.slice(1).every(f => f && typeof f === "object" && "en" in f && "zh_tw" in f && "ja" in f)) +
    " -> " + JSON.stringify(sample.footnotes.slice(1)));

  // type into the third row's English lane, including a double quote
  type(lanesOf(footRows()[2])[0], 'Second note with "quotes" and OwlTing’s apostrophe'); await wait(100);
  sample = JSON.parse(await output());
  log.push("9  typed footnote exact      : " + ok(sample.footnotes[2].en === 'Second note with "quotes" and OwlTing’s apostrophe'));

  // reorder
  click(footRows()[2].querySelectorAll(".tool")[0]); await wait(100);
  sample = JSON.parse(await output());
  log.push("9  footnote move up          : " + ok(sample.footnotes[1].en.startsWith("Second note")));

  // index labels must be 1-based
  log.push("9  index labels 1-based      : " + JSON.stringify(footRows().map(r => r.querySelector(".c1 .n").textContent)) +
    " " + ok(footRows()[0].querySelector(".c1 .n").textContent.trim() === "Item 1"));

  // remove everything, then add one back
  let fguard = 0;
  while (footRows().length && fguard++ < 8) {
    click(footRows()[0].querySelectorAll(".tool")[3]);
    await wait(80);
  }
  sample = JSON.parse(await output());
  log.push("9  emptied to []             : " + ok(Array.isArray(sample.footnotes) && sample.footnotes.length === 0));
  click(footAdd()); await wait(110);
  sample = JSON.parse(await output());
  log.push("9  re-add still localised    : " + ok(sample.footnotes.length === 1 &&
    JSON.stringify(sample.footnotes[0]) === '{"en":"","zh_tw":"","ja":""}') + " -> " + JSON.stringify(sample.footnotes));
  log.push("9  content array untouched   : " + ok(sample.content.length === 2) + " (len=" + sample.content.length + ")");

  // ── undo / redo across text, reordering and item changes ───────────────
  await restart();
  await paste('{"content":[{"title":{"en":"first","zh_tw":"","ja":""}},{"title":{"en":"second","zh_tw":"","ja":""}}],"notes":["note one"]}');
  const undoBtn = () => $$(".history .tool")[0];
  const redoBtn = () => $$(".history .tool")[1];
  const keydown = (key, extra) => window.dispatchEvent(new KeyboardEvent("keydown",
    Object.assign({ key, bubbles: true, cancelable: true, metaKey: true }, extra)));

  log.push("11 fresh doc: undo disabled  : " + ok(undoBtn().disabled && redoBtn().disabled));

  // a burst of typing must undo as one step
  const cell = $$(".row--field textarea")[0];
  type(cell, "f"); await wait(40);
  type(cell, "fi"); await wait(40);
  type(cell, "fir"); await wait(40);
  type(cell, "firstEDIT"); await wait(60);
  let doc11 = JSON.parse(await output());
  log.push("11 burst applied            : " + ok(doc11.content[0].title.en === "firstEDIT"));
  log.push("11 undo tooltip names it    : " + JSON.stringify(undoBtn().getAttribute("title")));
  click(undoBtn()); await wait(120);
  doc11 = JSON.parse(await output());
  log.push("11 one undo reverts burst   : " + ok(doc11.content[0].title.en === "first") + " -> " + JSON.stringify(doc11.content[0].title.en));
  click(redoBtn()); await wait(120);
  doc11 = JSON.parse(await output());
  log.push("11 redo restores burst      : " + ok(doc11.content[0].title.en === "firstEDIT"));

  // reorder, then undo it
  click($$(".row--strip")[1].querySelectorAll(".tool")[0]); await wait(100);
  doc11 = JSON.parse(await output());
  const reordered = doc11.content[0].title.en === "second";
  keydown("z"); await wait(140);
  doc11 = JSON.parse(await output());
  log.push("11 undo reorder             : " + ok(reordered && doc11.content[0].title.en === "firstEDIT") +
    " (reordered=" + reordered + ", after undo=" + JSON.stringify(doc11.content[0].title.en) + ")");

  // add an item, undo it
  const addContent = () => {
    const band = $$(".row--band").find(b => b.querySelector("h2").textContent.trim().toLowerCase() === "content");
    let n = band;
    while ((n = n.nextElementSibling)) {
      if (n.classList.contains("row--add") || n.classList.contains("row--empty")) return n.querySelector(".add");
      if (n.classList.contains("row--band")) break;
    }
    return null;
  };
  click(addContent()); await wait(120);
  const afterAdd = JSON.parse(await output()).content.length;
  keydown("z"); await wait(140);
  log.push("11 undo add item            : " + ok(afterAdd === 3 && JSON.parse(await output()).content.length === 2) +
    " (" + afterAdd + " -> " + JSON.parse(await output()).content.length + ")");

  // remove an item, undo it
  click($$(".row--strip")[0].querySelectorAll(".tool")[3]); await wait(120);
  const afterRemove = JSON.parse(await output()).content.length;
  keydown("z"); await wait(140);
  const restored = JSON.parse(await output());
  log.push("11 undo remove item         : " + ok(afterRemove === 1 && restored.content.length === 2 && restored.content[0].title.en === "firstEDIT"));

  // shift+cmd+z redoes
  keydown("z", { shiftKey: true }); await wait(140);
  log.push("11 shift+meta+z redoes      : " + ok(JSON.parse(await output()).content.length === 1));

  // undo the primitive-array edit too
  keydown("z", { shiftKey: false }); await wait(140);
  const noteCell = $$(".row--listitem textarea")[0];
  type(noteCell, "note one edited"); await wait(100);
  log.push("11 note edited              : " + ok(JSON.parse(await output()).notes[0] === "note one edited"));
  keydown("z"); await wait(140);
  log.push("11 undo note edit           : " + ok(JSON.parse(await output()).notes[0] === "note one") +
    " -> " + JSON.stringify(JSON.parse(await output()).notes[0]));

  // a new document must not be undoable back into the previous one
  await restart();
  await paste('{"a":{"en":"x","zh_tw":"","ja":""}}');
  log.push("11 history resets on parse  : " + ok(undoBtn().disabled && redoBtn().disabled));

  // ── mixed array must not turn an object into "[object Object]" ──────────
  await restart();
  await paste('{"mixed":[{"title":{"en":"kept","zh_tw":"","ja":""}},"a plain string"]}');
  const before = await output();
  const mixedRows = $$(".row--listitem");
  type(mixedRows[0].querySelector("textarea"), "edited string");
  await wait(90);
  const mixed = JSON.parse(await output());
  log.push("10 mixed array object intact : " + ok(mixed.mixed[0] && mixed.mixed[0].title && mixed.mixed[0].title.en === "kept") +
    " " + JSON.stringify(mixed.mixed).slice(0, 90));
  log.push("10 no [object Object]        : " + ok(!before.includes("[object Object]") && !JSON.stringify(mixed).includes("[object Object]")));

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

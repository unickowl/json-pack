// Drives the app into the editor so a screenshot can be taken of a real state.
const wait = ms => new Promise(r => setTimeout(r, ms));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const click = el => el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
(async () => {
  const t0 = Date.now();
  while (!$("#source") && Date.now() - t0 < 8000) await wait(50);
  if (location.hash === "#unlocalised") {
    const doc = {
      section_title: { en: "Live Infrastructure, In Numbers", zh_tw: "測試", ja: "力口" },
      footnotes: ["*Represents the annualized gross transaction value associated with active clients, calculated using the median of company-provided low and high estimates."],
      tags: ["fintech", "stablecoin"],
    };
    const el = $("#source");
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, JSON.stringify(doc, null, 4));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else if (location.hash === "#footnotes") {
    const doc = { footnotes: [
      { en: "*Represents the annualized gross transaction value associated with active clients, calculated using the median of company-provided low and high estimates.", zh_tw: "", ja: "" },
      { en: "", zh_tw: "", ja: "" } ] };
    const el = $("#source");
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value").set.call(el, JSON.stringify(doc, null, 4));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    click($(".link"));
  }
  await wait(120);
  click([...$$(".btn--fill")].find(b => b.textContent.includes("Build")));
  await wait(300);
  if (location.hash === "#edited") {
    // make one edit so the undo control is live in the screenshot
    const ta = $$(".row--field textarea")[0];
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), "value").set.call(ta, "US$600M+ edited");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(200);
  }
  if (location.hash === "#raw") { click([...$$(".btn--line")].find(b => b.textContent.includes("Raw"))); await wait(500); }
})();

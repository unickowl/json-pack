// Drives the app into the editor so a screenshot can be taken of a real state.
const wait = ms => new Promise(r => setTimeout(r, ms));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const click = el => el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
function load(text) {
  const content = $(".cm-content");
  content.focus();
  document.execCommand("selectAll");
  const data = new DataTransfer();
  data.setData("text/plain", text);
  content.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
}
const SAMPLE = {
  section_title: { en: "Live Infrastructure, In Numbers", zh_tw: "測試", ja: "力口" },
  content: [
    { title: { en: "US$600M+", zh_tw: "測試", ja: "力口" },
      paragraph_1: { en: "Cumulative Gross Payment Volume Processed", zh_tw: "測試", ja: "力口" },
      paragraph_2: { en: "Since inception through June 2026", zh_tw: "測試", ja: "力口" } },
    { title: { en: "60+", zh_tw: "測試", ja: "力口" },
      paragraph_1: { en: "Active Stablecoin Clients", zh_tw: "", ja: "力口" },
      paragraph_2: { en: "As of June 2026", zh_tw: "測試", ja: "" } },
  ],
  footnotes: [{ en: "*Represents the annualized gross transaction value associated with active clients, calculated using the median of company-provided low and high estimates. It does not represent OwlTing's recognized revenue or realized processed volume.", zh_tw: "", ja: "" }],
};
(async () => {
  const t0 = Date.now();
  while (!$(".cm-content") && Date.now() - t0 < 8000) await wait(50);
  if (location.hash === "#source") {
    // stay on the paste screen with content, to show the editor itself
    load(JSON.stringify(SAMPLE, null, 4).replace('"ja": ""', '"ja": ,'));
    await wait(1400);
    return;
  }
  if (location.hash === "#unlocalised") {
    const doc = {
      section_title: { en: "Live Infrastructure, In Numbers", zh_tw: "測試", ja: "力口" },
      footnotes: ["*Represents the annualized gross transaction value associated with active clients, calculated using the median of company-provided low and high estimates."],
      tags: ["fintech", "stablecoin"],
    };
    load(JSON.stringify(doc, null, 4));
  } else if (location.hash === "#footnotes") {
    const doc = { footnotes: [
      { en: "*Represents the annualized gross transaction value associated with active clients, calculated using the median of company-provided low and high estimates.", zh_tw: "", ja: "" },
      { en: "", zh_tw: "", ja: "" } ] };
    load(JSON.stringify(doc, null, 4));
  } else {
    load(JSON.stringify(SAMPLE, null, 4));
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

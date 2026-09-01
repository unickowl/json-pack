// Drives the app into the editor so a screenshot can be taken of a real state.
const wait = ms => new Promise(r => setTimeout(r, ms));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const click = el => el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
(async () => {
  const t0 = Date.now();
  while (!$("#source") && Date.now() - t0 < 8000) await wait(50);
  click($(".link"));
  await wait(120);
  click([...$$(".btn--fill")].find(b => b.textContent.includes("Build")));
  await wait(300);
  if (location.hash === "#raw") { click([...$$(".btn--line")].find(b => b.textContent.includes("Raw"))); await wait(500); }
})();

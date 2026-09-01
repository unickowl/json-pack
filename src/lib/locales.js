import { isI18n, isObj } from "./json-shape.js";

// Colour carries one meaning in this UI and one only: which locale you are looking at.
const KNOWN = {
  en: { name: "English", hue: "#2B5FD9" },
  zh_tw: { name: "繁體中文", hue: "#B8500F" },
  zh_cn: { name: "简体中文", hue: "#C0761B" },
  ja: { name: "日本語", hue: "#8E2F6B" },
  ko: { name: "한국어", hue: "#1F6F5C" },
  th: { name: "ไทย", hue: "#4B5AA8" },
  vi: { name: "Tiếng Việt", hue: "#7A5230" },
  id: { name: "Indonesia", hue: "#2E7D6B" },
  de: { name: "Deutsch", hue: "#55606B" },
  fr: { name: "Français", hue: "#3A6EA5" },
  es: { name: "Español", hue: "#A8501B" },
};
const FALLBACK = ["#4A5A6B", "#7A4F86", "#2E6E7D", "#8A5A2B", "#5A6E2E"];

export const localeMeta = (code, index = 0) =>
  KNOWN[code] || { name: String(code).toUpperCase(), hue: FALLBACK[index % FALLBACK.length] };

/** Locale order is taken from the document itself, first seen first. */
export function collectLocales(root) {
  const out = [];
  (function walk(node) {
    if (isI18n(node)) Object.keys(node).forEach(k => out.includes(k) || out.push(k));
    else if (Array.isArray(node)) node.forEach(walk);
    else if (isObj(node)) Object.values(node).forEach(walk);
  })(root);
  return out;
}

export const hueMap = locales =>
  Object.fromEntries(locales.map((code, i) => [code, localeMeta(code, i).hue]));

export const tint = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
};

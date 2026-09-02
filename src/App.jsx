import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseSource } from "./lib/parse.js";
import { collectShapes, collectKinds, findUnlocalisedTextArrays } from "./lib/json-shape.js";
import { collectLocales, hueMap } from "./lib/locales.js";
import { documentStats } from "./lib/format.js";
import { setIn, getIn } from "./lib/immutable.js";
import { pathKey } from "./lib/rows.js";
import { copyText } from "./lib/clipboard.js";
import {
  initHistory, applyChange, undo as undoHistory, redo as redoHistory,
  canUndo, canRedo, undoLabel, redoLabel,
} from "./lib/history.js";
import { SAMPLE } from "./sample.js";
import TopBar from "./components/TopBar.jsx";
import PasteScreen from "./components/PasteScreen.jsx";
import Editor from "./components/Editor.jsx";
import RawPanel from "./components/RawPanel.jsx";
import Toast from "./components/Toast.jsx";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const SHORTCUT = isMac ? "⌘⇧C" : "Ctrl⇧C";
const PLAIN_COPY = isMac ? "⌘C" : "Ctrl+C";
const UNDO_KEYS = isMac ? "⌘Z" : "Ctrl+Z";
const REDO_KEYS = isMac ? "⌘⇧Z" : "Ctrl+Y";

export default function App() {
  // Parse-time facts stay put; only the document moves through history.
  const [meta, setMeta] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const rawRef = useRef(null);
  const toastSeq = useRef(0);

  const doc = history ? history.present : null;

  const showToast = useCallback((message, bad = false) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message, bad });
  }, []);

  const handleParse = useCallback(text => {
    const result = parseSource(text);
    if (result.error) {
      setError(result.error);
      return;
    }
    const locales = collectLocales(result.data);
    // A document with no i18n leaves still needs one column to edit in.
    const usable = locales.length ? locales : ["value"];
    setError(null);

    // Every content value carrying its own locale map while one array does not
    // is worth raising before it ships, not after.
    const notices = [...result.notices];
    const shapeHint = "[{ " + usable.map(l => '"' + l + '": ""').join(", ") + " }]";
    findUnlocalisedTextArrays(result.data).forEach(path => {
      notices.push(
        path + " holds plain strings while the rest of this document is localised. " +
        "Did you mean " + shapeHint + "? Use \u201cMake localised\u201d on the array to convert it."
      );
    });

    setMeta({
      locales: usable,
      hues: hueMap(usable),
      shapes: collectShapes(result.data),
      originalKinds: collectKinds(result.data),
      localised: locales.length > 0,
      notices,
      name: "pasted_block.json",
    });
    setHistory(initHistory(result.data));
  }, []);

  const onValueChange = useCallback((path, value) => {
    const key = pathKey(path);
    setHistory(h =>
      applyChange(h, setIn(h.present, path, value), {
        label: "edit " + key,
        coalesceKey: key,
        now: Date.now(),
      })
    );
  }, []);

  const onArrayChange = useCallback((path, fn, label) => {
    setHistory(h =>
      applyChange(h, setIn(h.present, path, fn(getIn(h.present, path))), {
        label: label || "change " + pathKey(path),
        now: Date.now(),
      })
    );
  }, []);

  const undo = useCallback(() => setHistory(h => (h ? undoHistory(h) : h)), []);
  const redo = useCallback(() => setHistory(h => (h ? redoHistory(h) : h)), []);

  const reset = useCallback(() => {
    setMeta(null);
    setHistory(null);
    setError(null);
    setRawOpen(false);
  }, []);

  const copy = useCallback(async () => {
    if (!doc) return;
    const result = await copyText(JSON.stringify(doc, null, 4));
    if (result.ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      showToast("JSON copied to clipboard");
      return;
    }
    // Never claim a success that did not happen: open the output and select it
    // so the keyboard shortcut still works.
    setRawOpen(true);
    setTimeout(() => {
      const node = rawRef.current;
      if (!node) return;
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }, 200);
    showToast("The browser blocked the clipboard. The JSON is selected — press " + PLAIN_COPY + ".", true);
  }, [doc, showToast]);

  useEffect(() => {
    const onKey = e => {
      if (!history) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      if (e.shiftKey && key === "c") {
        e.preventDefault();
        copy();
        return;
      }
      // A controlled textarea's native undo stack goes out of sync with React,
      // so the app owns undo everywhere rather than leaving it to the field.
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (key === "y" && !isMac) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copy, history, undo, redo]);

  const status = useMemo(() => {
    if (!doc) return null;
    const { written, total, strings } = documentStats(doc, meta.locales);
    if (!total) return { tone: "is-ok", label: strings + (strings === 1 ? " value" : " values") };
    return written === total
      ? { tone: "is-ok", label: "complete" }
      : { tone: "is-warn", label: total - written + " empty" };
  }, [doc, meta]);

  const session = useMemo(() => (meta && doc ? { ...meta, doc } : null), [meta, doc]);

  return (
    <>
      <TopBar
        docName={meta?.name}
        status={status}
        hasDoc={!!session}
        rawOpen={rawOpen}
        copied={copied}
        shortcut={SHORTCUT}
        undoKeys={UNDO_KEYS}
        redoKeys={REDO_KEYS}
        canUndo={history ? canUndo(history) : false}
        canRedo={history ? canRedo(history) : false}
        undoLabel={history ? undoLabel(history) : null}
        redoLabel={history ? redoLabel(history) : null}
        onUndo={undo}
        onRedo={redo}
        onBack={reset}
        onToggleRaw={() => setRawOpen(v => !v)}
        onCopy={copy}
      />

      {session ? (
        <Editor
          session={session}
          onValueChange={onValueChange}
          onArrayChange={onArrayChange}
          onToast={showToast}
        />
      ) : (
        <PasteScreen error={error} sample={SAMPLE} onParse={handleParse} />
      )}

      <RawPanel
        open={rawOpen}
        doc={doc ?? {}}
        onClose={() => setRawOpen(false)}
        selectionRef={rawRef}
      />
      <Toast toast={toast} onHide={() => setToast(null)} />
    </>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseSource } from "./lib/parse.js";
import { collectShapes, collectKinds } from "./lib/json-shape.js";
import { collectLocales, hueMap } from "./lib/locales.js";
import { documentStats } from "./lib/format.js";
import { setIn, getIn } from "./lib/immutable.js";
import { copyText } from "./lib/clipboard.js";
import { SAMPLE } from "./sample.js";
import TopBar from "./components/TopBar.jsx";
import PasteScreen from "./components/PasteScreen.jsx";
import Editor from "./components/Editor.jsx";
import RawPanel from "./components/RawPanel.jsx";
import Toast from "./components/Toast.jsx";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const SHORTCUT = isMac ? "⌘⇧C" : "Ctrl⇧C";
const PLAIN_COPY = isMac ? "⌘C" : "Ctrl+C";

export default function App() {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const rawRef = useRef(null);
  const toastSeq = useRef(0);

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
    const usable = locales.length ? locales : ["value"];
    setError(null);
    setSession({
      doc: result.data,
      locales: usable,
      hues: hueMap(usable),
      shapes: collectShapes(result.data),
      originalKinds: collectKinds(result.data),
      notices: result.notices,
      name: "pasted_block.json",
    });
  }, []);

  const onValueChange = useCallback((path, value) => {
    setSession(s => ({ ...s, doc: setIn(s.doc, path, value) }));
  }, []);

  const onArrayChange = useCallback((path, fn) => {
    setSession(s => ({ ...s, doc: setIn(s.doc, path, fn(getIn(s.doc, path))) }));
  }, []);

  const reset = useCallback(() => {
    setSession(null);
    setError(null);
    setRawOpen(false);
  }, []);

  const copy = useCallback(async () => {
    if (!session) return;
    const result = await copyText(JSON.stringify(session.doc, null, 4));
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
  }, [session, showToast]);

  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "c" && session) {
        e.preventDefault();
        copy();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copy, session]);

  const status = useMemo(() => {
    if (!session) return null;
    const { written, total } = documentStats(session.doc, session.locales);
    if (!total) return { tone: "is-ok", label: "no strings" };
    return written === total
      ? { tone: "is-ok", label: "complete" }
      : { tone: "is-warn", label: total - written + " empty" };
  }, [session]);

  return (
    <>
      <TopBar
        docName={session?.name}
        status={status}
        hasDoc={!!session}
        rawOpen={rawOpen}
        copied={copied}
        shortcut={SHORTCUT}
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
        doc={session?.doc ?? {}}
        onClose={() => setRawOpen(false)}
        selectionRef={rawRef}
      />
      <Toast toast={toast} onHide={() => setToast(null)} />
    </>
  );
}

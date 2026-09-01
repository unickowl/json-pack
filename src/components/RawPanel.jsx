import { useEffect, useMemo, useRef, useState } from "react";
import { tokenizeJson } from "../lib/highlight.js";
import { IconClose } from "./Icons.jsx";

/**
 * Rendered as React elements from a token list — no innerHTML, so there is no
 * escaping to get wrong. Serialising is skipped entirely while the panel is
 * closed, and debounced while it is open.
 */
export default function RawPanel({ open, doc, onClose, selectionRef }) {
  const [text, setText] = useState("");
  const preRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(() => setText(JSON.stringify(doc, null, 4)), 120);
    return () => clearTimeout(id);
  }, [open, doc]);

  useEffect(() => { if (selectionRef) selectionRef.current = preRef.current; }, [selectionRef, text]);

  const tokens = useMemo(() => tokenizeJson(text), [text]);

  return (
    <aside className={"raw" + (open ? " is-open" : "")} aria-hidden={!open}>
      <div className="raw-top">
        <span className="eyebrow">Output preview</span>
        <span className="spacer" />
        <button className="tool" onClick={onClose} aria-label="Close preview" tabIndex={open ? 0 : -1}>
          <IconClose />
        </button>
      </div>
      <pre ref={preRef}>
        {tokens.map((t, i) => (t.cls ? <span key={i} className={t.cls}>{t.text}</span> : t.text))}
      </pre>
    </aside>
  );
}

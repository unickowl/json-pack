import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  placeholder as cmPlaceholder,
} from "@codemirror/view";
import {
  syntaxHighlighting, HighlightStyle, bracketMatching, indentOnInput, foldGutter, foldKeymap,
} from "@codemirror/language";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { errorPosition } from "../lib/parse.js";
import { linter, lintGutter } from "@codemirror/lint";
import { tags as t } from "@lezer/highlight";

// The same four token colours the output preview uses, so the JSON reads the
// same on the way in as it does on the way out.
const highlight = HighlightStyle.define([
  { tag: t.propertyName, color: "var(--cobalt)" },
  { tag: t.string, color: "#1f6f4a" },
  { tag: t.number, color: "#8a5a2b" },
  { tag: [t.bool, t.null], color: "#7a4f86" },
  { tag: t.punctuation, color: "var(--ink3)" },
  { tag: t.invalid, color: "var(--bad)" },
]);

/**
 * The package's own linter reads the offset out of the engine's message, which
 * only one of V8's two message shapes carries — every other error then lands on
 * line 1. This uses the same position logic as the error panel, so the inline
 * marker and the panel always point at the same character.
 */
const jsonLinter = view => {
  const text = view.state.doc.toString();
  if (!text.length) return [];
  try {
    JSON.parse(text);
    return [];
  } catch (error) {
    const at = Math.min(errorPosition(text, error), text.length);
    return [{ from: at, to: Math.min(at + 1, text.length), severity: "error", message: error.message }];
  }
};

const theme = EditorView.theme({
  "&": { fontSize: "12.5px", backgroundColor: "transparent", color: "var(--ink)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--mono)",
    lineHeight: "1.7",
    padding: "12px 0",
    minHeight: "250px",
    maxHeight: "56vh",
  },
  ".cm-content": { padding: "0" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--ink4)",
    paddingRight: "6px",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--ink2)" },
  ".cm-activeLine": { backgroundColor: "rgba(20, 23, 26, 0.022)" },
  ".cm-placeholder": { color: "var(--ink4)" },
  ".cm-selectionBackground, ::selection": { backgroundColor: "var(--cobalt-soft)" },
  ".cm-cursor": { borderLeftColor: "var(--ink)" },
  ".cm-lintRange-error": { backgroundImage: "none", borderBottom: "1.5px solid var(--bad)" },
  // An untouched editor must not look broken: the placeholder sits inside line
  // one, so the active-line wash would otherwise shade the whole example.
  "&:has(.cm-placeholder) .cm-activeLine": { backgroundColor: "transparent" },
  "&:has(.cm-placeholder) .cm-activeLineGutter": { color: "var(--ink4)" },
  ".cm-tooltip": {
    border: "1px solid var(--line)",
    borderRadius: "8px",
    backgroundColor: "#fff",
    boxShadow: "var(--sh2)",
    fontFamily: "var(--body)",
    fontSize: "12.5px",
    color: "var(--bad)",
  },
  ".cm-tooltip.cm-tooltip-lint": { padding: "2px 4px" },
});

/**
 * The JSON source surface. A real editor rather than a textarea, so brackets
 * close and indent themselves and a syntax error is underlined where it is
 * instead of only being reported after pressing the button.
 */
export default function JsonEditor({ value, placeholder, onChange }) {
  const host = useRef(null);
  const view = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const instance = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          foldGutter(),
          lintGutter(),
          history(),
          indentOnInput(),
          bracketMatching(),
          json(),
          // An empty document is not valid JSON, but reporting that before the
          // user has typed anything is noise, not help — jsonLinter returns
          // nothing for an empty document.
          linter(jsonLinter),
          syntaxHighlighting(highlight),
          cmPlaceholder(placeholder),
          EditorView.lineWrapping,
          keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
          theme,
          EditorView.updateListener.of(update => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = instance;
    return () => instance.destroy();
    // Built once: the document is pushed in below rather than by remounting.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the editor in step when the value is replaced from outside.
  useEffect(() => {
    const instance = view.current;
    if (!instance) return;
    const current = instance.state.doc.toString();
    if (current === value) return;
    instance.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  return <div className="cm-host" ref={host} />;
}

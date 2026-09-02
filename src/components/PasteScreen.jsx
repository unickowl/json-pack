import { useState } from "react";

// The shape this tool expects, in one glance: a localised field, an array of
// records, and an array of localised values. Kept in step with SAMPLE.
const PLACEHOLDER = `{
    "section_title": { "en": "…", "zh_tw": "…", "ja": "…" },
    "content": [
        { "title": { "en": "…", "zh_tw": "…", "ja": "…" } }
    ],
    "footnotes": [
        { "en": "…", "zh_tw": "…", "ja": "…" }
    ]
}`;

export default function PasteScreen({ error, sample, onParse }) {
  const [text, setText] = useState("");

  return (
    <section className="paste-wrap">
      <div className="paste">
        <div className="eyebrow" style={{ marginBottom: 12 }}>Step 1 · Bring your JSON</div>
        <h1>Paste a JSON block.<br />Get a translation table.</h1>
        <p className="sub">
          Nested objects become fields, arrays become items you can add and remove, and every locale
          gets its own column. Your JSON is parsed in this page and never uploaded.
        </p>

        <div className={"dz" + (error ? " is-bad" : "")}>
          <div className="dz-top">
            <span className="eyebrow">Source</span>
            <span className="spacer" />
            <span className="eyebrow">{text.length.toLocaleString()} characters</span>
          </div>

          <label className="visually-hidden" htmlFor="source">JSON source</label>
          <textarea
            id="source"
            spellCheck={false}
            placeholder={PLACEHOLDER}
            value={text}
            onChange={e => setText(e.target.value)}
          />

          <div className="dz-bot">
            <button className="btn btn--fill" onClick={() => onParse(text)}>Build the table</button>
            <button className="link" onClick={() => setText(JSON.stringify(sample, null, 4))}>
              Load the example
            </button>
          </div>

          {error && (
            <div className="errbox">
              <p className="err">{error.message}</p>
              {error.snippet && <pre>{error.snippet}</pre>}
              {error.hints.length > 0 && (
                <ul>{error.hints.map((h, i) => <li key={i}>{h}</li>)}</ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

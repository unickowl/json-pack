# json-pack mockup — review log

Single-file interactive prototype: `index.html`
Demo flags: `?paste` · `?raw` · `?err` (parse diagnostics) · `?dupe` (notice bar + scalar field)

## Layout rule (why v2 replaced v1)

v1 measured as pixel-aligned (`282,472,785,1097` identical across cards; row heights 59/60)
but *read* as messy. Causes: four near-identical surface colours, the column header printed
once per card, and the three locale lanes chopped by full-width grey bars three times down
the page. Plus `.block{overflow:hidden}` silently killed the sticky header.

v2 rule:

> Only an array's group band may span full width. Every other control lives in column 1,
> so the locale lanes run unbroken.

One table, one sticky header.

## Security / robustness testing

Run with headless Chrome + injected probe scripts (`--dump-dom`), not by reading code alone.

| Test | Result |
|---|---|
| XSS via key names, values, `</span>`/`</pre>`/`</textarea>` breakouts, `<img onerror>`, `<svg onload>`, `<iframe>` | No injection. 0 elements created, 0 flags fired. `#rawOut` contains only the highlighter's own `SPAN`s; payloads render as escaped text. `highlight()` escapes `& < >` *before* inserting markup — order matters, keep it. |
| Prototype pollution — `__proto__` as top-level array key, as item field key, `constructor`, `prototype` (sent as raw JSON text so the keys survive `JSON.parse` as own properties) | `Object.prototype` untouched; `({}).constructor === Object` holds; added items keep a clean prototype. |
| Deep nesting (20 000 levels) | Survived; recursive walkers did not blow the stack. |
| Clipboard rejects | **Was broken** — showed "JSON copied to clipboard" and turned the button green anyway. Fixed. |
| Clipboard hangs (never settles — real behaviour when the document lacks focus) | **Was broken** — silent no-op, zero feedback. Now guarded by a 1500 ms race → honest error toast + the JSON is auto-selected in the raw panel. |
| Per-keystroke cost, 400 items / 213 KB, raw panel **closed** | **Was ~50 ms per character** (100 keystrokes: 10.36 s vs 5.30 s baseline, external wall clock). `refresh()` re-walked the doc, re-stringified 213 KB, ran 3 regex passes and wrote ~250 KB of `innerHTML` on every input event. Now gated on the panel being open + 120 ms debounce → **~1.6 ms** (100 keystrokes: 4.66 s vs 4.50 s). |

Note: `performance.now()` and `Date.now()` do not advance under `--virtual-time-budget`;
in-page timings read 0 ms. Timing was measured as process wall clock instead.

Hardening applied: `blankItem` uses `Object.defineProperty` instead of assignment, so a field
literally named `__proto__` stays an own property. This also fixed silent data loss — such a
field used to disappear from newly added items. `shapes` is a `Map`, `hue` is
`Object.create(null)`.

## Format fidelity (round-trip) testing

Prompted by: users will type double quotes and other symbols — injection is not the only risk.
Method: feed nasty input through parse → (edit) → `JSON.stringify`, then diff against the source.

**Passing, verified byte-exact:**

- No-edit round trip is character-for-character identical with `"` `\` `/`, newlines, tabs,
  emoji, astral surrogate pairs, NBSP, zero-width spaces, control characters, curly quotes and
  full-width punctuation in values.
- Typing `say "hello" \ and “smart”` into a cell produces valid JSON that re-parses to exactly
  that string. `JSON.stringify` does the escaping; nothing hand-rolls it.
- The raw preview's `textContent` equals the copied output exactly, quotes included — the
  highlighter never alters the text it displays. (Assert this with a wait: `renderRaw` is
  debounced 120 ms, and checking immediately gives a false failure.)

**Was broken, now fixed:**

| | Before | Now |
|---|---|---|
| Scalar types | editing `"count": 60` wrote `"count": "61"` — silent type corruption | `coerce()` keeps number/boolean/null; the label shows `number → string` in amber if the new text genuinely isn't a number |
| Number-like keys | `{"10":…,"2":…}` silently emitted as `2,10` (JS orders integer-like keys first) | detected at parse time, warned in a notice bar |
| Duplicate keys | `{"en":"a","en":"b"}` silently kept the last one | raw text is scanned (JSON.parse hides this), user is told which keys lost data |
| BOM | `Expected property name at position 1` on JSON that looks perfect | stripped automatically and reported |
| Parse errors | six different mistakes all produced the same useless message | line/column, a caret-marked snippet, and a specific cause: curly quotes, trailing comma, single quotes, `//` or `/* */` comments, unquoted keys |
| Invisible characters in values | nothing | leading/trailing whitespace, NBSP, zero-width and control characters flagged per cell with a tooltip and counted in the document sub-line. Curly quotes are **not** flagged — they are legitimate typography in copy |

**Inherent, disclosed rather than fixed:** `JSON.parse` is lossy for numbers —
`12345678901234567890` → `12345678901234567000`, `1.50` → `1.5`, `1e5` → `100000`. Avoiding
this needs a lossless parser that keeps the source text of each number.

**No regressions:** the security suite still passes with payloads routed through the new notice
and error-snippet paths (0 elements injected, prototype clean), and per-keystroke cost stayed
flat despite the added format scan (100 keystrokes on 400 items: +0.08 s).

## Open items for the Vite + React port

1. **Self-host the fonts.** The page currently pulls Archivo / IBM Plex from
   `fonts.googleapis.com` + `fonts.gstatic.com`. The JSON never leaves the page, but Google
   sees the request. UI copy was corrected to "Your JSON is parsed in this page and never
   uploaded." Self-hosting makes the stronger claim true and the tool work offline.
2. **Add a CSP.** No policy today.
3. **Nesting deeper than `content[i].title.en` is silently skipped** — decide between generic
   recursive rendering or an explicit "unsupported shape" warning. Silent skipping means a
   copied JSON could quietly drop fields, which is the worst failure mode for this tool.
4. **Draft persistence** (localStorage) — undecided.
5. Recursive walkers should become iterative or depth-capped if untrusted input is ever in play.
6. Consider a lossless number parser if any block ever carries high-precision numeric values.

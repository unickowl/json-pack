# JSON Pack

Paste a block of i18n content JSON, edit it as a translation table, copy it back out.
Runs entirely in the browser: nothing is uploaded, and the built app makes no outbound
network requests at all (fonts are bundled).

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # -> dist/
pnpm preview    # serve the build
```

Node 26 (`.node-version`), matching `node-version: 26` in the deploy workflow. fnm, nvm and
asdf all read that file, and with fnm's `--use-on-cd` the switch happens on `cd`. `engines` in
`package.json` states the same thing; pnpm treats a mismatch as a warning rather than an error,
so an older Node still builds — it just tells you it is not what the project expects.

The build output is byte-identical on Node 22 and Node 26 (same bundle hash locally and in CI),
so the version is about staying aligned with CI, not about the artifact differing.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds with pnpm and publishes
`dist/` to GitHub Pages. Live at:

    https://unickowl.github.io/json-pack/

`vite.config.js` sets `base: "./"`, so assets resolve relative to the document and the app
works under the `/json-pack/` sub-path without hardcoding it.

## Keeping it out of search engines

Be clear about what this does and does not achieve.

**A GitHub Pages site is public. There is no private option** outside GitHub Enterprise Cloud,
so the URL is reachable by anyone who has it, whatever the repo's visibility. What limits the
exposure here is the design, not the hosting: the tool stores nothing and uploads nothing, so
a stranger with the URL gets an empty editor, never your content.

What is actually in effect:

| Layer | On GitHub Pages | Notes |
|---|---|---|
| `noindex` meta tags in `index.html` | **works** | Per-crawler tags for Google, Bing, Yahoo, DuckDuckGo, Baidu and Yandex, plus `referrer: no-referrer`. This is the effective control |
| Meta `Content-Security-Policy` | **works** | `default-src 'none'`, `connect-src 'none'` — the page cannot make network requests even if something tried |
| `public/robots.txt` | **inert** | Crawlers only read `robots.txt` at the *domain* root. On a project page that is `unickowl.github.io/robots.txt`, which this repo does not control. Kept for other hosts |
| `public/_headers` (`X-Robots-Tag`, CSP, `Referrer-Policy`) | **inert** | Pages cannot set response headers. Read by Netlify and Cloudflare Pages, so it stays for portability |

`frame-ancestors` and `X-Robots-Tag` have no meta equivalent, so they are simply unavailable
on Pages. If any of this needs to be a real restriction rather than a request, host it behind
authentication instead — that is the only control that actually restricts access.

## Layout rule

The whole document is one table with one sticky header. Only an array's group band may span
the full width; every other control lives in column 1, so the locale lanes run unbroken down
the page. Breaking that rule is what made an earlier draft read as misaligned even though the
grid was pixel-exact.

## The source editor

The paste step is a CodeMirror 6 editor rather than a textarea: JSON syntax highlighting,
bracket matching, auto-indent, folding, line numbers, and a syntax error underlined at the
character it occurs on while you type. There is no "load the example" button — the placeholder
is the example.

Two things worth recording about it:

- **Its linter is ours, not the package's.** V8 reports syntax errors in two shapes and only
  one carries an offset: `… in JSON at position 16 (line 1 column 17)`, versus
  `Unexpected token ',', ..."…" is not valid JSON`, which embeds a slice of the source instead.
  `jsonParseLinter` reads the offset out of the message, so every error of the second shape
  lands on line 1. `errorPosition()` in `src/lib/parse.js` recovers the offset by locating that
  slice, and both the editor's inline marker and the error panel use it, so they always point
  at the same character. The same bug was in this app's own error panel until the editor
  exposed it.
- **It costs about 350 kB.** The bundle went from 216 kB to 569 kB raw, 69 kB to 183 kB gzip.
  That is the floor for CodeMirror with JSON language support and linting; trimming optional
  extensions saved 8 kB. Monaco unpacks to 93 MB and `vanilla-jsoneditor` to 9.8 MB, and the
  latter's tree view would have duplicated the table editor this app already is.

The output preview deliberately stays a hand-rolled token renderer. CodeMirror virtualises its
viewport, so only the visible lines exist in the DOM — which would break the clipboard
fallback, where the whole document has to be selectable when the browser blocks a copy.

## Behaviour worth knowing

- **Item shape is fixed.** Each array's field shape is captured at parse time, so adding an
  item always reproduces the same thing even after deleting every item first: the same fields
  (`title`, `paragraph_1`, `paragraph_2`) with every locale for an array of records, a blank
  set of locales for an array of localised values such as `footnotes`, an empty string for an
  array of plain strings.
- **An array element can be a localised value in its own right.** `footnotes` is an array of
  `{en, zh_tw, ja}`, and each entry is one row with the translations side by side in the locale
  columns — not three stacked rows. Column 1 carries the item's index, its real path
  (`footnotes[0]`) and its reorder / duplicate / remove controls, so the lanes stay unbroken.
- **Element type is decided per element, not per array.** An i18n leaf gets locale columns, a
  record gets a header plus its own field rows, a plain string gets one wide value. A mixed
  array therefore gets the right treatment for each element; dispatching per array would send
  an object down the scalar path and `String(value)` would write `[object Object]` back out.
- **A document with no localised fields still works.** Paste a bare `footnotes` array and the
  locale chrome disappears rather than showing an invented column.
- **Types survive edits.** Editing `"count": 60` to `61` writes the number `61`, not `"61"`.
  If the new text is no longer a number, the field label says `number → string` rather than
  changing the type silently.
- **Every change is reversible.** Undo/redo (`⌘Z` / `⌘⇧Z`, `Ctrl+Z` / `Ctrl+Y`) covers text
  edits, reordering, duplicating, adding and removing items — including entries in string
  arrays. A burst of typing collapses into one step, so undo steps back over a word rather than
  a character; structural changes are always their own step. The button tooltip names what will
  be reversed, e.g. *Undo edit content[0].title.en*. History resets when a new document is
  parsed, and is capped at 100 steps.

  Two consequences worth knowing. Removing an item asks for no confirmation, because an undo
  that actually works beats a modal asking whether you meant it — the toast says which keys to
  press. And the app takes over `⌘Z` even inside a text field: a controlled React textarea's
  native undo stack drifts out of sync with application state, so leaving undo to the field
  would be the less reliable option.
- **Copy never lies.** If the clipboard is blocked or hangs, the output panel opens with the
  JSON selected and an error is shown — no false success.
- **An unlocalised prose array is questioned.** If every other value carries its own locale
  map and one array holds bare strings, that is usually a modelling mistake, so the document
  says so on parse and the array's band offers **Make localised** — one undoable step that moves
  each string into the first locale and blanks the rest. The heuristic only fires on prose (a
  string containing a space, or longer than 40 characters), so `["fintech", "stablecoin"]` is
  left alone, and it never fires on a document with no localised values at all.

  This check exists because the tool's own `footnotes` was first built as a bare string array
  while every neighbouring field was localised, and nothing pointed out the contradiction.
- **Problems are surfaced, not swallowed.** Duplicate keys, number-like keys (which JavaScript
  reorders), and a leading byte-order mark all produce a notice. Invisible characters
  (leading/trailing whitespace, NBSP, zero-width, control characters) are flagged per cell.
  Curly quotes are deliberately *not* flagged — they are legitimate inside copy.
- **Nothing is silently skipped.** Nested objects and nested arrays render recursively, so a
  copied document never quietly loses fields.

## Known limits

- `JSON.parse` is lossy for numbers: `12345678901234567890` → `12345678901234567000`,
  `1.50` → `1.5`, `1e5` → `100000`. Fixing this needs a parser that keeps each number's source
  text.
- Typing cost grows with document size: unmeasurable at 5–25 items, ~3.4 ms/keystroke at 100
  items, ~21 ms at 400 items (1200 fields). The cause is that the whole table re-renders per
  keystroke. If documents ever get that large, move the document into an external store so a
  keystroke re-renders only its own cell.
- No draft persistence. Reloading loses the document — deliberate, since nothing is written to
  storage without asking.
- The bundle is 183 kB gzip, most of it the source editor. Fine over a fast connection for a
  tool used a few times a day; not something to ship on a landing page.

## Tests

`tests/` holds browser probes that drive the built app rather than reading its source.

```sh
pnpm build && pnpm preview --port 4317   # in one shell
./run-browser-tests.sh                   # plants the probes into dist/
./measure-perf.sh 25 100 400             # keystroke cost by document size
```

Two things these scripts guard against, both learned the hard way:

1. `vite build` empties `dist/`, and the preview server answers a missing file with
   `index.html`. A deleted probe therefore gets served as HTML, silently never runs, and every
   assertion "passes". Both scripts assert their probe actually executed.
2. `performance.now()` and `Date.now()` do not advance under `--virtual-time-budget`, so
   in-page timings read 0 ms. Timing is measured as external process wall clock.

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

## Behaviour worth knowing

- **Item shape is fixed.** Each array's field shape is captured at parse time, so adding an
  item always reproduces the same thing even after deleting every item first — the same fields
  (`title`, `paragraph_1`, `paragraph_2`) with every locale for an array of objects, an empty
  string for an array of strings such as `footnotes`.
- **Arrays of plain strings are editable too.** `footnotes` is a string array: each entry gets
  its own row with reorder, duplicate and remove, and an Add item row. The value spans the
  locale columns because the string is not localised, which the band states explicitly.
- **Element type is decided per element, not per array.** A mixed array keeps its objects as
  objects; dispatching per array would send an object down the scalar path and `String(value)`
  would write `[object Object]` back out.
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

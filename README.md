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

## Keeping it out of search engines

This is an internal tool, so exclusion is layered:

| Where | What |
|---|---|
| `index.html` | `noindex, nofollow, noarchive, nosnippet, noimageindex` plus per-crawler tags for Google, Bing, Yahoo, DuckDuckGo, Baidu and Yandex, and `referrer: no-referrer` |
| `public/robots.txt` | `Disallow: /` for every user agent |
| `public/_headers` | `X-Robots-Tag: noindex, nofollow, …` — read by Netlify and Cloudflare Pages. Stronger than the meta tag because it also covers non-HTML responses |

Worth being clear about the limit: all three only *ask* crawlers to stay away, and a
`Disallow` rule cannot stop someone who has the URL. If the content is sensitive, put the
deployment behind authentication or on an internal network — that is the only real control.

`public/_headers` also carries a CSP (`default-src 'none'`, `connect-src 'none'`) for hosts
that read it. On a host that ignores the file, set the same headers in its own config.

## Layout rule

The whole document is one table with one sticky header. Only an array's group band may span
the full width; every other control lives in column 1, so the locale lanes run unbroken down
the page. Breaking that rule is what made an earlier draft read as misaligned even though the
grid was pixel-exact.

## Behaviour worth knowing

- **Item shape is fixed.** Each array's field shape is captured at parse time, so adding an
  item always reproduces the same fields (`title`, `paragraph_1`, `paragraph_2`) with every
  locale, even after deleting every item first.
- **Types survive edits.** Editing `"count": 60` to `61` writes the number `61`, not `"61"`.
  If the new text is no longer a number, the field label says `number → string` rather than
  changing the type silently.
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

#!/bin/sh
# Rebuilds, re-plants the probe files (vite build empties dist/), and asserts
# that they actually executed. The preview server falls back to index.html for
# missing files, so a silently-absent probe would otherwise look like a pass.
set -e
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=${PORT:-4317}
pnpm build >/dev/null
python3 - "$@" <<'PY'
import shutil, pathlib
html = pathlib.Path("dist/index.html").read_text(encoding="utf-8")
for name, script in (("test", "probe.js"), ("perf", "perf.js"), ("shot", "shot.js")):
    shutil.copy(f"tests/{script}", f"dist/{script}")
    pathlib.Path(f"dist/{name}.html").write_text(
        html.replace("</body>", f'<script src="./{script}"></script></body>'), encoding="utf-8")
PY
# guard against the SPA fallback silently serving HTML as JavaScript
head -c 20 "dist/probe.js" | grep -q "doctype" && { echo "probe.js is HTML - aborting"; exit 1; }
echo "planted: $(wc -c < dist/probe.js) bytes probe.js, $(wc -c < dist/perf.js) bytes perf.js"

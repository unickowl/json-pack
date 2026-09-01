#!/bin/sh
# Wall-clock, measured externally: performance.now() does not advance under
# --virtual-time-budget. Each run must emit #PERF or the number is meaningless.
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=${PORT:-4317}
run() { # items, keys -> seconds, asserts the probe ran
  s=$(python3 -c 'import time;print(time.time())')
  dom=$("$CHROME" --headless=new --disable-gpu --window-size=1400,900 --virtual-time-budget=60000 \
        --dump-dom "http://localhost:$PORT/perf.html?n=$1#$2" 2>/dev/null)
  e=$(python3 -c 'import time;print(time.time())')
  case "$dom" in *'id="PERF"'*) : ;; *) echo "PROBE DID NOT RUN (items=$1 keys=$2)" >&2; exit 1 ;; esac
  python3 -c "print('%.4f' % ($e-$s))"
}
for n in "$@"; do
  a=$(run "$n" 0) || exit 1
  b=$(run "$n" 100) || exit 1
  python3 -c "print('items=%-4s baseline=%ss  +100keys=%ss  -> %.1f ms/keystroke' % ('$n','$a','$b',($b-$a)*1000/100))"
done

#!/usr/bin/env sh
# Starts the web UI (macOS / Linux).
#   sh web.sh            fresh game
#   sh web.sh --preview  scripted mid-game state, for reviewing the layout
set -eu
cd "$(dirname "$0")"

mkdir -p build/web
javac -encoding UTF-8 --release 17 -d build/web $(find src -name '*.java')

exec java -cp build/web restaurantrush.ui.GameWebServer "$@"

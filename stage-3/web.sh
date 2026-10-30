#!/usr/bin/env sh
# Starts the web UI (macOS / Linux). Compiles all three stages, each into its own
# build/web; the stage is chosen in the page.
#   sh web.sh            fresh game
#   sh web.sh --preview  scripted mid-game state, for reviewing the layout
set -eu
cd "$(dirname "$0")"

for stage in ../stage-1 ../stage-2 .; do
    (
        cd "$stage"
        mkdir -p build/web
        javac -encoding UTF-8 --release 17 -d build/web $(find src -name '*.java')
    )
done

exec java -cp build/web restaurantrush.ui.GameWebServer "$@"

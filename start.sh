#!/usr/bin/env sh
# Restaurant Rush - one-stop launcher (macOS / Linux).
#   sh start.sh            menu
#   sh start.sh web        web UI, fresh game
#   sh start.sh preview    web UI with a mid-game state
#   sh start.sh cli        command line, Stage 3
#   sh start.sh cli2       command line, Stage 2
#   sh start.sh cli1       command line, Stage 1
#   sh start.sh test       all three test suites
set -eu
cd "$(dirname "$0")"

if ! command -v javac >/dev/null 2>&1; then
    echo "javac was not found on PATH. Install JDK 17 or newer." >&2
    exit 1
fi

run() {
    case "$1" in
        web)     sh stage-3/web.sh ;;
        preview) sh stage-3/web.sh --preview ;;
        cli)     sh stage-3/run.sh ;;
        cli2)    sh stage-2/run.sh ;;
        cli1)    sh stage-1/run.sh ;;
        test)    sh verify.sh ;;
        *)       echo "Unknown action: $1" >&2; exit 2 ;;
    esac
}

if [ "$#" -gt 0 ]; then
    run "$1"
    exit 0
fi

while :; do
    echo ""
    echo "  Restaurant Rush - launcher"
    echo "  [1] Web UI - play in the browser"
    echo "  [2] Web UI - layout preview"
    echo "  [3] Command line - Stage 3 (full)"
    echo "  [4] Command line - Stage 2"
    echo "  [5] Command line - Stage 1 (basic)"
    echo "  [6] Run all tests"
    echo "  [q] Quit"
    printf "  Choose: "
    read -r choice
    case "$choice" in
        1) run web ;;
        2) run preview ;;
        3) run cli ;;
        4) run cli2 ;;
        5) run cli1 ;;
        6) run test ;;
        q|Q) exit 0 ;;
        *) echo "  Unknown choice: $choice" ;;
    esac
    printf "  Press Enter to return to the menu... "
    read -r _
done

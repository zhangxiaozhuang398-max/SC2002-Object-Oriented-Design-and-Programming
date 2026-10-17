# Starts the web UI. Compiles every source file (including restaurantrush.ui),
# starts the local server and opens the browser.
#
#   .\web.ps1            fresh game
#   .\web.ps1 --preview  scripted mid-game state, for reviewing the layout
$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command javac -ErrorAction SilentlyContinue)) {
    throw "javac was not found on PATH. Install a JDK 17 or newer and reopen the terminal."
}

$out = "build/web"
New-Item -ItemType Directory -Path $out -Force | Out-Null

# Relative paths only, so a non-ASCII folder name cannot corrupt them on the way to javac.
$sources = @(Get-ChildItem -LiteralPath "src" -Recurse -Filter "*.java" | Resolve-Path -Relative)
& javac -encoding UTF-8 --release 17 -d $out @sources
if ($LASTEXITCODE -ne 0) {
    throw "Compilation failed."
}

& java -cp $out restaurantrush.ui.GameWebServer @args

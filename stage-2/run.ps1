$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Path 'build/classes' -Force | Out-Null
    # Relative paths only: Windows PowerShell 5.1 mangles non-ASCII characters when an
    # absolute path is handed to javac, which then reports "Invalid filename".
    $sources = @(Get-ChildItem -LiteralPath 'src/restaurantrush' -Filter '*.java' | ForEach-Object { 'src/restaurantrush/' + $_.Name })
    & javac -encoding UTF-8 --release 17 -d 'build/classes' @sources
    if ($LASTEXITCODE -ne 0) { throw 'Compilation failed.' }
    & java -cp 'build/classes' restaurantrush.Main @args
    if ($LASTEXITCODE -ne 0) { throw "Game exited with code $LASTEXITCODE." }
} finally {
    Pop-Location
}

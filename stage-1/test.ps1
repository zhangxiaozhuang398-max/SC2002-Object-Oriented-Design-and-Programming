$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Path 'build/tests' -Force | Out-Null
    # Relative paths only, so a non-ASCII folder name cannot corrupt them on the way to javac.
    $sources = @(Get-ChildItem -LiteralPath 'src/restaurantrush' -Filter '*.java' | ForEach-Object { 'src/restaurantrush/' + $_.Name })
    $tests = @(Get-ChildItem -LiteralPath 'test/restaurantrush' -Filter '*.java' | ForEach-Object { 'test/restaurantrush/' + $_.Name })
    & javac -encoding UTF-8 --release 17 -d 'build/tests' @sources @tests
    if ($LASTEXITCODE -ne 0) { throw 'Test compilation failed.' }
    & java -cp 'build/tests' restaurantrush.GameTests
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
} finally {
    Pop-Location
}

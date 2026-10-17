<#
    Restaurant Rush - one-stop launcher / 一键启动器

    Double-click start.bat (Windows) or run `sh start.sh` (macOS/Linux) for a menu,
    or call it with an action for a direct start:

        start.bat web       web UI, fresh game         网页版（新开一局）
        start.bat preview   web UI with a mid-game state 网页版（中局预览）
        start.bat cli       command line, Stage 3       命令行 Stage 3
        start.bat cli2      command line, Stage 2       命令行 Stage 2
        start.bat cli1      command line, Stage 1       命令行 Stage 1
        start.bat test      all three test suites       跑全部测试

    Nothing here contains game rules: this file only picks a script and runs it.
#>
param([string]$Action = "")

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location -LiteralPath $root

function Confirm-Jdk {
    if (Get-Command javac -ErrorAction SilentlyContinue) {
        return $true
    }
    Write-Host ""
    Write-Host "  javac was not found on PATH." -ForegroundColor Red
    Write-Host "  Install JDK 17 or newer, then reopen the terminal." -ForegroundColor Red
    Write-Host "  未在 PATH 中找到 javac：请安装 JDK 17 或更高版本后重新打开终端。" -ForegroundColor Red
    Write-Host ""
    return $false
}

function Invoke-Action([string]$name) {
    switch ($name) {
        "web"     { & (Join-Path $root "stage-3\web.ps1") }
        "preview" { & (Join-Path $root "stage-3\web.ps1") "--preview" }
        "cli"     { & (Join-Path $root "stage-3\run.ps1") }
        "cli2"    { & (Join-Path $root "stage-2\run.ps1") }
        "cli1"    { & (Join-Path $root "stage-1\run.ps1") }
        "test"    { & (Join-Path $root "verify.ps1") }
        default   { throw "Unknown action '$name'. Use: web | preview | cli | cli2 | cli1 | test" }
    }
}

function Show-Menu {
    Write-Host ""
    Write-Host "  +--------------------------------------------------------------+" -ForegroundColor DarkGray
    Write-Host "  |  Restaurant Rush  -  launcher / 启动器                        |" -ForegroundColor Cyan
    Write-Host "  +--------------------------------------------------------------+" -ForegroundColor DarkGray
    Write-Host "  |  [1] Web UI - play in the browser    网页版（推荐，浏览器里玩）|"
    Write-Host "  |  [2] Web UI - layout preview         网页版布局预览（中局状态）|"
    Write-Host "  |  [3] Command line - Stage 3 (full)   命令行 Stage 3（完整版）  |"
    Write-Host "  |  [4] Command line - Stage 2          命令行 Stage 2（VIP+Critic）|"
    Write-Host "  |  [5] Command line - Stage 1 (basic)  命令行 Stage 1（基础版）  |"
    Write-Host "  |  [6] Run all tests                   跑全部测试（368 断言）    |"
    Write-Host "  |  [q] Quit                            退出                      |"
    Write-Host "  +--------------------------------------------------------------+" -ForegroundColor DarkGray
    Write-Host "  Tip: the web UI opens the browser for you and runs until Ctrl+C."
    Write-Host "       网页版会自动打开浏览器，按 Ctrl+C 停止服务。"
    Write-Host ""
}

if (-not (Confirm-Jdk)) {
    [void](Read-Host "  Press Enter to close / 按回车关闭")
    exit 1
}

if ($Action -ne "") {
    try {
        Invoke-Action $Action.Trim().ToLower()
    } catch {
        Write-Host ""
        Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    exit $LASTEXITCODE
}

while ($true) {
    Show-Menu
    $choice = (Read-Host "  Choose / 请选择").Trim().ToLower()
    $key = ""
    switch ($choice) {
        "1" { $key = "web" }
        "2" { $key = "preview" }
        "3" { $key = "cli" }
        "4" { $key = "cli2" }
        "5" { $key = "cli1" }
        "6" { $key = "test" }
        "q" { exit 0 }
        default { Write-Host "  Unknown choice / 无效选择：$choice" -ForegroundColor Yellow }
    }
    if ($key -eq "") {
        continue
    }
    try {
        Invoke-Action $key
    } catch {
        Write-Host ""
        Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
    [void](Read-Host "  Press Enter to return to the menu / 回车返回菜单")
}

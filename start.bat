@echo off
rem One-stop launcher. Batch files are not subject to the PowerShell execution
rem policy, so this works even when .ps1 files are blocked ("not digitally signed").
rem The real implementation lives in start.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
set "CODE=%errorlevel%"
if not "%CODE%"=="0" pause
exit /b %CODE%

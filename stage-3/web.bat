@echo off
rem Web UI entry point. Batch files are not subject to the PowerShell execution
rem policy; the real implementation stays in web.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0web.ps1" %*
set "CODE=%errorlevel%"
if not "%CODE%"=="0" pause
exit /b %CODE%

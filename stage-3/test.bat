@echo off
rem Windows entry point that bypasses the PowerShell execution policy.
rem The real implementation stays in test.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0test.ps1" %*
set "CODE=%errorlevel%"
rem Keep the window open when the suite fails, so the failure stays readable.
if not "%CODE%"=="0" pause
exit /b %CODE%

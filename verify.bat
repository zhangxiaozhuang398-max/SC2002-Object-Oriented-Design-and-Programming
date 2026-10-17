@echo off
rem Runs all three stage test suites. Batch files are not subject to the PowerShell
rem execution policy, which otherwise refuses to load verify.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify.ps1" %*
set "CODE=%errorlevel%"
if not "%CODE%"=="0" pause
exit /b %CODE%

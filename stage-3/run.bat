@echo off
rem Windows entry point. Batch files are not subject to the PowerShell execution
rem policy, which otherwise refuses to load run.ps1 ("not digitally signed").
rem The real implementation stays in run.ps1, so there is only one copy of the logic.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*
set "CODE=%errorlevel%"
rem Keep the window open after an interactive game so the final result stays readable.
if "%~1"=="" pause
exit /b %CODE%

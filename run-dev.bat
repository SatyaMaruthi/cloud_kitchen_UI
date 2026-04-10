@echo off
setlocal
cd /d "%~dp0"
echo Starting React frontend...
call npm.cmd run dev
endlocal

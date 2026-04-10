@echo off
setlocal
cd /d "%~dp0"
echo Installing frontend dependencies...
call npm.cmd install
if errorlevel 1 (
  echo.
  echo Failed to install dependencies.
  exit /b 1
)
echo.
echo Dependencies installed successfully.
endlocal

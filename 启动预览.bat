@echo off
setlocal
title Formula Search - Local Preview
cd /d "%~dp0"

set "PREVIEW_URL=http://127.0.0.1:4321"

where npm.cmd >nul 2>nul
if errorlevel 1 goto :npm_missing
call npm.cmd exec -- astro dev status 2>nul | findstr /C:"Dev server running" >nul
if not errorlevel 1 goto :open_preview

echo Starting local preview...
echo Preview URL: %PREVIEW_URL%
echo.

call npm.cmd run dev -- --host 127.0.0.1
if errorlevel 1 goto :start_failed

:open_preview
echo.
echo Preview is running. Opening your browser...
start "" "%PREVIEW_URL%"
echo Double-click the stop preview script when you are finished.
ping 127.0.0.1 -n 3 >nul
exit /b 0

:npm_missing
echo ERROR: npm.cmd was not found.
echo Install Node.js or add npm to PATH, then try again.
goto :failed

:start_failed
echo.
echo ERROR: The local preview could not be started.

:failed
echo Press any key to close this window.
pause >nul
exit /b 1

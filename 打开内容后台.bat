@echo off
setlocal
title Formula Content Studio
cd /d "%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 goto :npm_missing

echo Starting Formula Content Studio...
echo The control center will open at http://127.0.0.1:4321/content-studio
echo.
call npm.cmd run content:studio
if errorlevel 1 goto :start_failed
exit /b 0

:npm_missing
echo ERROR: npm.cmd was not found.
echo Install Node.js or add npm to PATH, then try again.
goto :failed

:start_failed
echo.
echo ERROR: The content studio could not be started.

:failed
echo Press any key to close this window.
pause >nul
exit /b 1

@echo off
setlocal
title Formula Search - Stop Preview
cd /d "%~dp0"

echo Stopping local preview...
call npm.cmd run dev -- stop

echo.
echo Done. Press any key to close this window.
pause >nul

@echo off
setlocal
title Green Room - start
cd /d "%~dp0"

if not exist .env goto noenv
findstr /c:"SMARTSPECTRA_API_KEY=your_key_here" .env >nul 2>nul
if not errorlevel 1 goto nokey
findstr /b /c:"SMARTSPECTRA_API_KEY=" .env >nul 2>nul
if errorlevel 1 goto nokey

echo ============================================================
echo    GREEN ROOM  -  starting
echo ============================================================
echo.
echo Your browser will open in a few seconds at
echo    http://localhost:8787
echo.
echo Leave this black window open while you use the app.
echo To finish a session, press Ctrl+C here, or just close it.
echo.
echo Remember: sit still and stay quiet for the first 30 seconds.
echo.
start "" /min cmd /c "ping -n 5 127.0.0.1 >nul & start "" http://localhost:8787"
node runner.cjs
echo.
echo Session ended.
pause
exit /b 0

:noenv
echo The settings file .env is missing.
echo Run 1-SETUP.cmd, then 4-KEY.cmd, to create it and paste your key.
pause
exit /b 1

:nokey
echo Your .env file exists but does not contain a key yet.
echo Double-click 4-KEY.cmd and paste the key from
echo    https://physiology.presagetech.com
pause
exit /b 1

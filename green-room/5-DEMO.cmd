@echo off
setlocal
title Green Room - demo mode
cd /d "%~dp0"
echo ============================================================
echo    GREEN ROOM  -  demo mode
echo ============================================================
echo.
echo This plays a scripted speaker through the real coaching code.
echo No camera, no API key, no SDK. Useful for showing the app when
echo the live signal is unavailable.
echo.
echo Every number you see is generated, not measured. Say so in
echo the video if you use this for a demo.
echo.
echo Your browser will open at http://localhost:8787
echo Press Ctrl+C in this window for the session summary.
echo.
start "" /min cmd /c "ping -n 5 127.0.0.1 >nul & start "" http://localhost:8787"
node runner.cjs --demo
echo.
echo Session ended.
pause
exit /b 0

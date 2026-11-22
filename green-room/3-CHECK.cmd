@echo off
setlocal
title Green Room - check
cd /d "%~dp0"
echo ============================================================
echo    GREEN ROOM  -  step 2 of 3:  check
echo ============================================================
echo.
echo This tests the coaching logic. It needs no camera and no key.
echo If you see "9/9 passing" at the end, your install is healthy.
echo.
call npm test
echo.
echo ------------------------------------------------------------
echo If you saw 9/9 passing: everything is installed correctly.
echo Next, double-click 2-RUN.cmd
echo.
echo If you saw errors: run 1-SETUP.cmd again and watch for red text.
echo ------------------------------------------------------------
pause

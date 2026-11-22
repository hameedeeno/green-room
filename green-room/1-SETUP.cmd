@echo off
setlocal
title Green Room - setup
cd /d "%~dp0"
echo ============================================================
echo    GREEN ROOM  -  step 1 of 3:  setup
echo ============================================================
echo.
echo This checks your computer, then installs the one library the
echo app needs. You will need internet for this step.
echo.

where node >nul 2>nul
if errorlevel 1 goto nonode

echo Node.js is installed. Good.
node -v
echo.
echo Installing the Presage library. This downloads around 50 MB.
echo You will see a progress bar and possibly some yellow warnings.
echo Yellow warnings are normal. Only red text is a problem.
echo.
call npm install --omit=dev --no-audit --no-fund
if errorlevel 1 goto npmfail

if not exist .env (
  if exist .env.example copy /y .env.example .env >nul 2>nul
  if not exist .env (
    >.env echo # Green Room settings. Keep this file private.
    >>.env echo SMARTSPECTRA_API_KEY=
  )
  echo.
  echo A settings file called .env has been created.
)

echo.
echo ============================================================
echo   Almost done. Notepad is about to open.
echo.
echo   Find this line:   SMARTSPECTRA_API_KEY=your_key_here
echo   Replace  your_key_here  with the key you copied from the
echo   Presage website, so it looks like:
echo.
echo      SMARTSPECTRA_API_KEY=eyJhbGciOi...
echo.
echo   Then press Ctrl+S to save, and close Notepad.
echo ============================================================
echo.
pause
start /wait notepad .env

echo.
echo Setup finished.
echo.
echo   Next: double-click  3-CHECK.cmd   to prove everything works.
echo   Then: double-click  2-RUN.cmd     to start a session.
echo.
pause
exit /b 0

:nonode
echo ------------------------------------------------------------
echo   Node.js is not installed yet. That is step one.
echo ------------------------------------------------------------
echo.
echo   1. Open your browser and go to   https://nodejs.org
echo   2. Click the big green button that says LTS
echo   3. When it downloads, double-click the file
echo   4. Click Next, Next, Next, then Install, then Finish
echo   5. Close this window
echo   6. Double-click 1-SETUP.cmd again
echo.
echo   Nothing can break. If it asks for permission, say yes.
echo.
pause
exit /b 1

:npmfail
echo.
echo ------------------------------------------------------------
echo   The install stopped with an error above.
echo ------------------------------------------------------------
echo.
echo   Try this first, it fixes the most common cause on Windows:
echo   double-click  FIX-WINDOWS-BLOCK.cmd  then run 1-SETUP.cmd again.
echo.
echo   If it still fails, take a photo of the red text and send it
echo   to whoever is helping you. The red line is the answer.
echo.
pause
exit /b 1

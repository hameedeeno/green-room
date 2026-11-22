@echo off
setlocal
title Green Room - your API key
cd /d "%~dp0"
echo ============================================================
echo    GREEN ROOM  -  your Presage API key
echo ============================================================
echo.
echo This creates your settings file and opens it in Notepad.
echo Nothing here is shared with anyone. The key stays on this PC.
echo.
echo In Notepad you will see one line:
echo.
echo    SMARTSPECTRA_API_KEY=
echo.
echo Paste your key AFTER the equals sign. No quote marks, no spaces.
echo It should end up looking like:
echo.
echo    SMARTSPECTRA_API_KEY=eyJhbGciOi...
echo.
echo Then press Ctrl+S to save, and close Notepad.
echo ============================================================
echo.
pause

if exist .env goto openit

>.env echo # Green Room settings. Keep this file private, never upload it.
>>.env echo # Paste the key from https://physiology.presagetech.com after the equals sign.
>>.env echo SMARTSPECTRA_API_KEY=

:openit
start /wait notepad .env

echo.
findstr /c:"SMARTSPECTRA_API_KEY=your_key_here" .env >nul 2>nul
if not errorlevel 1 goto badkey
findstr /b /c:"SMARTSPECTRA_API_KEY=" .env >nul 2>nul
if errorlevel 1 goto badkey

echo Checking that the key was saved...
findstr /r /c:"^SMARTSPECTRA_API_KEY=..........................." .env >nul 2>nul
if errorlevel 1 goto maybeempty

echo.
echo Looks good. Your key is saved.
echo.
echo NEXT: double-click  2-RUN.cmd   to start a session.
echo Sit still and stay quiet for the first 30 seconds.
echo.
pause
exit /b 0

:maybeempty
echo.
echo The file saved, but the key looks empty or very short.
echo Double-click 4-KEY.cmd again and paste the whole key in one go.
echo A Presage key is a long line of letters, numbers and dots.
echo.
pause
exit /b 1

:badkey
echo.
echo Hmm. The key line is missing or still says your_key_here.
echo Double-click 4-KEY.cmd again, paste the key after the equals sign,
echo then press Ctrl+S before closing Notepad.
echo.
pause
exit /b 1

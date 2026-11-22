@echo off
setlocal
title Green Room - write a report
cd /d "%~dp0"
set REPORT=%~dp0report.txt

>%REPORT% echo ============================================
>>%REPORT% echo GREEN ROOM REPORT  -  send this text to whoever is helping you
>>%REPORT% echo ============================================
>>%REPORT% echo Folder: %CD%
>>%REPORT% echo Date:   %DATE% %TIME%
>>%REPORT% echo.

>>%REPORT% echo --- Node.js ---
node -v >>%REPORT% 2>&1
if errorlevel 1 goto nonode
npm -v >>%REPORT% 2>&1
goto files

:nonode
>>%REPORT% echo NODE IS NOT INSTALLED

:files
>>%REPORT% echo.
>>%REPORT% echo --- Files in this folder ---
dir /b >>%REPORT% 2>&1

>>%REPORT% echo.
>>%REPORT% echo --- Presage library ---
if exist node_modules\@smartspectra\node-sdk\package.json goto libok
>>%REPORT% echo NOT INSTALLED
goto key

:libok
>>%REPORT% echo installed
>>%REPORT% echo.
>>%REPORT% echo --- Library version ---
findstr /c:"\"version\"" node_modules\@smartspectra\node-sdk\package.json >>%REPORT% 2>&1

:key
>>%REPORT% echo.
>>%REPORT% echo --- Settings file .env ---
if exist .env goto envexists
>>%REPORT% echo MISSING
goto tests

:envexists
>>%REPORT% echo present
findstr /r /c:"^SMARTSPECTRA_API_KEY=..........................." .env >nul 2>nul
if errorlevel 1 goto noapikey
>>%REPORT% echo key: looks set
goto tests

:noapikey
>>%REPORT% echo key: EMPTY OR PLACEHOLDER

:tests
>>%REPORT% echo.
>>%REPORT% echo --- Self test ---
call npm test >>%REPORT% 2>&1

>>%REPORT% echo.
>>%REPORT% echo --- END OF REPORT ---
>>%REPORT% echo If you see 9/9 passing above, this PC is ready.

echo.
echo A report has been written to report.txt and is opening in Notepad.
echo Copy everything in it, or photograph it, and send it on.
echo.
start "" notepad %REPORT%
pause
exit /b 0

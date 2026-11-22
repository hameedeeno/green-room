@echo off
setlocal
title Fix Windows script blocking
echo This changes one Windows setting so the install scripts are allowed
echo to run. It affects only your own user account and is reversible.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force"
echo.
echo Done. Close this window, then double-click 1-SETUP.cmd again.
pause

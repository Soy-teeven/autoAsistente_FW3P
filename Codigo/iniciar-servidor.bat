@echo off
title Servidor y Tunel Cloudflare - Compartir Proyecto
cd /d "%~dp0"
echo.
echo =========================================================
echo  Levantando servidor local y creando tunel de Cloudflare
echo =========================================================
echo.
node start-server.js
pause

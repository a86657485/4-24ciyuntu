@echo off
cd /d "%~dp0"

echo ============================================
echo   Teacher Evaluation Dashboard
echo   Game:  http://localhost:3001
echo   Admin: http://localhost:3001/admin
echo ============================================
echo.
echo Ctrl+C to stop
echo.

set NODE_ENV=production
node server-bundled.js

echo.
echo Server stopped.
pause

@echo off
title Teacher Evaluation Dashboard
cd /d "%~dp0"

echo ============================================
echo    Teacher Evaluation Dashboard
echo ============================================
echo.
echo   Game:   http://localhost:3001
echo   Admin:  http://localhost:3001/admin
echo.
echo   Other devices on the same network:
echo   replace localhost with this PC's IP address
echo.
echo Starting server on port 3001...
echo.

set NODE_ENV=production
node server-bundled.js 2>&1
set ERR=%errorlevel%

if %ERR% neq 0 (
    echo.
    echo ============================================
    echo   SERVER STOPPED (exit code: %ERR%)
    echo.
    echo   Common fixes:
    echo   1. Port 3001 in use - close other copies
    echo      or run: netstat -ano ^| findstr :3001
    echo   2. Node.js not installed - run: node --version
    echo ============================================
    pause
)

@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo    Teacher Evaluation Dashboard
echo ============================================
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
    echo   Access: http://%%a:3001/admin
)
echo.
echo Starting server on port 3001...
echo Press Ctrl+C to stop.
echo.
set NODE_ENV=production
node server-bundled.js
pause

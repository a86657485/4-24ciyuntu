@echo off
chcp 65001 >nul
title 词云图大冒险 - 一键启动

echo.
echo  ╔══════════════════════════════════════╗
echo  ║   词云图大冒险 - 本地一键部署        ║
echo  ║   第4课《抽取文本汇词云》教学游戏     ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 https://nodejs.org
    pause
    exit /b 1
)

:: Check/create .env.local
if not exist ".env.local" (
    echo [提示] 首次运行，需要配置 DeepSeek API Key
    set /p APIKEY="请输入 DeepSeek API Key: "
    echo DEEPSEEK_API_KEY="!APIKEY!" > .env.local
    echo GEMINI_API_KEY="!APIKEY!" >> .env.local
    echo APP_URL="http://localhost:3001" >> .env.local
    echo [完成] .env.local 已创建
    echo.
)

:: Install dependencies
if not exist "node_modules" (
    echo [1/2] 正在安装依赖...
    call npm install
    echo.
) else (
    echo [1/2] 依赖已安装，跳过
)

:: Start server
echo [2/2] 启动服务...
echo.
echo ══════════════════════════════════════════
echo  学习应用：http://localhost:3001
echo  数据大屏：http://localhost:3001/admin
echo ══════════════════════════════════════════
echo.
echo 按 Ctrl+C 停止服务
echo.

call npx tsx server.ts

pause

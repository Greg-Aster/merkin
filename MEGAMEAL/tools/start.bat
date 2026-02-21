@echo off
echo 🛠️  Starting MEGAMEAL Development Tools...
echo ===================================================
echo.
echo 🚀 Zero-install, self-contained development tools
echo 💻 No dependencies required!
echo.

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js found: %NODE_VERSION%
echo.
echo 🌐 Starting server...
echo 📂 Project root: %~dp0..
echo.

REM Start the application
node app.js

pause
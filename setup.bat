@echo off
echo ============================================
echo  GMS - Garage Management System
echo  Setup Script for Windows
echo ============================================
echo.

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not running.
    echo Please install Docker Desktop from https://docker.com
    pause
    exit /b 1
)

echo Docker found. Starting GMS...
echo.

cd /d "%~dp0"

REM Build and start
docker-compose up --build -d

if %errorlevel% neq 0 (
    echo ERROR: Failed to start GMS containers.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  GMS is starting up...
echo  Please wait 30-60 seconds for all services
echo  to initialize.
echo.
echo  Access GMS at: http://localhost:8080
echo  API Docs at:   http://localhost:8001/api/docs
echo.
echo  Default Login:
echo    Mobile:   9999999999
echo    Password: Admin@123
echo ============================================
echo.
pause

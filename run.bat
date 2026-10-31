@echo off
setlocal enabledelayedexpansion
title Vivona — Wedding Planning Platform

echo ======================================================================
echo                     VIVONA — LUXURY WEDDING PLATFORM
echo         Rajasthan Wedding Operations ^& Command Center Engine
echo ======================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in your PATH.
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Check pnpm
where pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] pnpm not found. Installing pnpm globally via npm...
    call npm install -g pnpm
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install pnpm globally. Please run: npm install -g pnpm
        pause
        exit /b 1
    )
)

:: 3. Check for .env.local
if not exist ".env.local" (
    echo [INFO] .env.local not found. Creating from .env.example...
    copy .env.example .env.local >nul
    echo [INFO] Created .env.local.
)

:: 4. Check for node_modules
if not exist "node_modules" (
    echo [INFO] Dependencies not detected. Running pnpm install...
    call pnpm install
    call pnpm approve-builds --all
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
)

echo.
echo Select an action to run:
echo   [1] Start Development Server (pnpm dev)  [DEFAULT]
echo   [2] Build and Start Production Server (pnpm build ^&^& pnpm start)
echo   [3] Run Test Suite (Vitest permissions ^& currency tests)
echo   [4] Run Verification (Typecheck ^& Lint)
echo   [5] Seed Demo Database (Admin, Employees, Caterers)
echo   [0] Exit
echo.

set "CHOICE=1"
set /p "CHOICE=Enter choice (0-5) [Default 1]: "

if "%CHOICE%"=="1" goto DEV
if "%CHOICE%"=="2" goto PROD
if "%CHOICE%"=="3" goto TEST
if "%CHOICE%"=="4" goto CHECK
if "%CHOICE%"=="5" goto SEED
if "%CHOICE%"=="0" goto EXIT
goto DEV

:DEV
echo.
echo ======================================================================
echo Starting Vivona Development Server at http://localhost:3000 ...
echo ======================================================================
echo.
start http://localhost:3000
call pnpm dev
goto END

:PROD
echo.
echo ======================================================================
echo Building and Starting Vivona Production Server ...
echo ======================================================================
echo.
call pnpm build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Production build failed.
    pause
    exit /b 1
)
start http://localhost:3000
call pnpm start
goto END

:TEST
echo.
echo ======================================================================
echo Running Vivona Test Suite (Vitest) ...
echo ======================================================================
echo.
call pnpm test
pause
goto END

:CHECK
echo.
echo ======================================================================
echo Running Strict Typecheck and Lint ...
echo ======================================================================
echo.
call pnpm typecheck
call pnpm lint
pause
goto END

:SEED
echo.
echo ======================================================================
echo Seeding Demo Database (Requires active Supabase instance) ...
echo ======================================================================
echo.
call pnpm db:seed
pause
goto END

:EXIT
exit /b 0

:END
exit /b 0

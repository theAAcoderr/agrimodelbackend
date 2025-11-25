@echo off
echo ========================================
echo   AgriModel Backend Startup Script
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [1/5] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
) else (
    echo [1/5] Dependencies already installed
)

REM Check if .env exists
if not exist ".env" (
    echo [2/5] Creating .env file...
    copy .env.example .env
    echo.
    echo WARNING: Please edit .env and update JWT_SECRET before production!
    echo.
) else (
    echo [2/5] .env file exists
)

echo [3/5] Testing database connection...
call npm run test-db
if errorlevel 1 (
    echo.
    echo ERROR: Database connection failed!
    echo Please check your DATABASE_URL in .env file
    echo.
    pause
    exit /b 1
)

echo.
echo [4/5] Checking if tables exist...
REM Migration will be smart - only create if needed
call npm run migrate
if errorlevel 1 (
    echo ERROR: Migration failed
    pause
    exit /b 1
)

echo.
echo [5/5] Starting server...
echo.
echo ========================================
echo   Server will start on http://localhost:3000
echo   Press Ctrl+C to stop
echo ========================================
echo.

call npm run dev


@echo off
echo Starting PostgreSQL for All4You Auction System...
echo.

REM Start Docker Desktop if not running
echo Checking Docker Desktop...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker Desktop is not running. Please start Docker Desktop first.
    echo You can find Docker Desktop in your Start menu or system tray.
    pause
    exit /b 1
)

REM Start PostgreSQL with Docker Compose
echo Starting PostgreSQL database...
docker-compose up -d postgres

REM Wait a moment for startup
echo Waiting for database to be ready...
timeout /t 10 /nobreak >nul

REM Check if database is ready
docker exec all4you_postgres pg_isready -U postgres -d all4you_auctions
if %errorlevel% eq 0 (
    echo.
    echo ✅ PostgreSQL is ready!
    echo ✅ Database: all4you_auctions
    echo ✅ Host: localhost:5432
    echo ✅ User: postgres
    echo.
    echo Database admin panel: http://localhost:8080
    echo   - System: PostgreSQL
    echo   - Server: postgres
    echo   - Username: postgres
    echo   - Password: your_secure_password_here
    echo   - Database: all4you_auctions
    echo.
    echo You can now start your API server: npm start
) else (
    echo ❌ Database not ready yet. Please wait a few more seconds.
)

pause
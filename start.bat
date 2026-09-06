:: Shelf2Cash — Windows Startup Script
:: Run this from the project root: start.bat

@echo off
echo ======================================
echo    Shelf2Cash - Starting All Services
echo ======================================

:: Start ML Service
echo [1/3] Starting Python ML Service on :8000 ...
start "ML Service" cmd /k "cd ml-service && pip install -r requirements.txt -q && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait 3 seconds
timeout /t 3 /nobreak >nul

:: Start Backend
echo [2/3] Starting Node.js Backend on :5000 ...
start "Backend" cmd /k "cd backend && npm run dev"

:: Wait 3 seconds
timeout /t 3 /nobreak >nul

:: Start Frontend
echo [3/3] Starting Frontend on :5173 ...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ======================================
echo   All services started!
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:5000
echo   ML API:    http://localhost:8000/docs
echo   WS:        ws://localhost:5000/ws
echo ======================================
echo.
echo To seed the database first time, run:
echo   cd backend ^&^& node src/seed/run.js
echo.
pause

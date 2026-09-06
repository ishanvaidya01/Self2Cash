#!/bin/bash
# Shelf2Cash — Startup Script
# Run this from the project root: bash start.sh

echo "══════════════════════════════════════"
echo "   Shelf2Cash — Starting All Services"
echo "══════════════════════════════════════"

# 1. Start ML microservice
cd ml-service
echo "[1/3] Starting Python ML Service on :8000"
pip install -r requirements.txt -q
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
ML_PID=$!

# 2. Seed database (only if first run)
cd ../backend
if [ "$SEED_DB" = "1" ]; then
  echo "[2/3] Seeding MongoDB with 90-day history..."
  node src/seed/run.js
fi

# 3. Start backend
echo "[2/3] Starting Node.js backend on :5000"
npm run dev &
BACKEND_PID=$!

# 4. Start frontend
cd ../frontend
echo "[3/3] Starting Vite dev server on :5173"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "══════════════════════════════════════"
echo "  Services started!"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:5000"
echo "  ML API:    http://localhost:8000/docs"
echo "  WS:        ws://localhost:5000/ws"
echo "══════════════════════════════════════"
echo ""
echo "First run? Run:  SEED_DB=1 bash start.sh"
echo "Press Ctrl+C to stop all services"

wait

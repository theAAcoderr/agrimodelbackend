#!/bin/bash

echo "========================================"
echo "  AgriModel Backend Startup Script"
echo "========================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[1/5] Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: npm install failed"
        exit 1
    fi
else
    echo "[1/5] Dependencies already installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "[2/5] Creating .env file..."
    cp .env.example .env
    echo ""
    echo "WARNING: Please edit .env and update JWT_SECRET before production!"
    echo ""
else
    echo "[2/5] .env file exists"
fi

echo "[3/5] Testing database connection..."
npm run test-db
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Database connection failed!"
    echo "Please check your DATABASE_URL in .env file"
    echo ""
    exit 1
fi

echo ""
echo "[4/5] Checking if tables exist..."
npm run migrate
if [ $? -ne 0 ]; then
    echo "ERROR: Migration failed"
    exit 1
fi

echo ""
echo "[5/5] Starting server..."
echo ""
echo "========================================"
echo "  Server will start on http://localhost:3000"
echo "  Press Ctrl+C to stop"
echo "========================================"
echo ""

npm run dev


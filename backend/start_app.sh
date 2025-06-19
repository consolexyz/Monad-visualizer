#!/bin/bash
# Script to run both the backend API and frontend together

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install backend dependencies
echo "Installing backend dependencies..."
pip install -r requirements.txt

# Start the backend API server in the background
echo "Starting backend API server..."
source venv/bin/activate && python server.py &
BACKEND_PID=$!

# Change to frontend directory
echo "Starting frontend development server..."
cd ../frontend

# Install frontend dependencies (if needed)
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start the frontend development server
npm run dev

# When the user terminates with Ctrl+C, also kill the backend
trap "echo 'Shutting down servers...'; kill $BACKEND_PID; exit" INT

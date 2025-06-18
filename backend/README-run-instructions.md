# Running the Monad Transaction Tracker

This document provides instructions for running the backend and frontend components individually.

## Running the Backend

### Step 1: Navigate to the backend directory
```bash
cd /Users/moses/Desktop/monad-envio/backend
```

### Step 2: Create and activate a Python virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Run the API server
```bash
python api_server.py
```

This will start the API server at http://localhost:3001 and expose endpoints:
- GET /api/init (call this endpoint first to initialize)
- GET /api/transactions?fromBlock=0&limit=10
- GET /api/status

### Step 5: Initialize the client
After starting the API server, you should call the initialization endpoint:
```bash
curl http://localhost:3001/api/init
```

## Running the Frontend

### Step 1: Open a new terminal and navigate to the frontend directory
```bash
cd /Users/moses/Desktop/monad-envio/frontend
```

### Step 2: Install npm dependencies (first time only)
```bash
npm install
```

### Step 3: Start the development server
```bash
npm run dev
```

This will typically start the Vite development server at http://localhost:5173.

### Step 4: Access the frontend
Open your web browser and navigate to the URL shown in the terminal (typically http://localhost:5173).

## Testing the API

You can test the backend API endpoints using curl:

```bash
# Initialize the client (do this first)
curl http://localhost:3001/api/init

# Get status
curl http://localhost:3001/api/status

# Get transactions
curl http://localhost:3001/api/transactions?fromBlock=0&limit=10
```

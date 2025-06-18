# Monad Transaction Tracker

This Python application tracks live transactions on the Monad blockchain using Envio's HyperSync API.

## Setup Instructions

1. Make sure you have Python 3.8+ installed
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Create an API token at https://docs.envio.dev/docs/HyperSync/api-tokens
4. Copy the `.env.example` file to `.env` and add your API token:
   ```
   cp .env.example .env
   ```
5. Edit the `.env` file and set your `HYPERSYNC_BEARER_TOKEN`
6. Run the application:
   ```
   python monad_tracker.py
   ```

## What It Does

This tracker continuously polls the Monad blockchain for new blocks and transactions, displaying their details in real-time. It includes:

- Real-time block monitoring
- Transaction details for each block
- Chain reorganization detection
- Error handling and automatic retries

## Configuration

- `POLL_INTERVAL_SECONDS`: Adjust in code to change how frequently the app checks for new blocks
- `MONAD_HYPERSYNC_URL`: The URL of the Monad testnet HyperSync endpoint

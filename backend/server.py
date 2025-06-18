from flask import Flask, jsonify, request
from flask_cors import CORS
import hypersync
import asyncio
import os
from dotenv import load_dotenv
import time
from hypersync import TransactionField, BlockField

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load environment variables
load_dotenv()

# Constants
MONAD_HYPERSYNC_URL = "https://monad-testnet.hypersync.xyz"
bearer_token = os.environ.get("HYPERSYNC_BEARER_TOKEN")

# Initialize HypersyncClient
client_config = hypersync.ClientConfig(
    url=MONAD_HYPERSYNC_URL,
    bearer_token=bearer_token
)

# Cache for storing recent transactions
transaction_cache = []
last_block_number = 0

# Metrics tracking
block_cache = []  # Store recent blocks for TPS calculation
last_metrics_update = 0
current_metrics = {
    'tps': 0,
    'block_height': 0,
    'validators': 0,  # This will be estimated or fetched if available
    'avg_block_time': 0
}

# Initialize the client
client = hypersync.HypersyncClient(client_config)

# Helper function to run async code in a synchronous context
def run_async(coroutine):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(coroutine)
        return result
    finally:
        loop.close()

# In newer Flask versions, we need to initialize as part of app context
def initialize_client():
    global client
    try:
        print("HypersyncClient initialized.")
        
        # Populate initial cache
        run_async(update_transaction_cache())
    except Exception as e:
        print(f"Error initializing HypersyncClient: {e}")

# Create a route that will be called to initialize the client
@app.route('/api/init', methods=['GET'])
def init():
    initialize_client()
    return jsonify({"status": "success", "message": "Client initialized"})

async def update_transaction_cache():
    global transaction_cache, last_block_number, block_cache
    
    try:
        latest_block_number = await client.get_height()
        
        # Enhanced query with optimized field selection and advanced features
        query = hypersync.Query(
            from_block=max(0, latest_block_number - 10),  # Get last 10 blocks for better context
            to_block=latest_block_number + 1,  # Exclusive end block
            blocks=[{}],  # Include all blocks in range
            transactions=[{}],  # Include all transactions
            field_selection=hypersync.FieldSelection(
                transaction=[
                    TransactionField.HASH,
                    TransactionField.FROM,
                    TransactionField.TO,
                    TransactionField.VALUE,
                    TransactionField.BLOCK_NUMBER,
                    TransactionField.TRANSACTION_INDEX,
                    TransactionField.GAS_USED,
                    TransactionField.GAS_PRICE,
                    TransactionField.STATUS,
                    TransactionField.INPUT,
                    TransactionField.KIND,  # Transaction type
                    TransactionField.NONCE,
                    TransactionField.CUMULATIVE_GAS_USED,
                ],
                block=[
                    BlockField.NUMBER,
                    BlockField.TIMESTAMP,
                    BlockField.HASH,
                    BlockField.PARENT_HASH,
                    BlockField.MINER,
                    BlockField.GAS_USED,
                    BlockField.GAS_LIMIT,
                    BlockField.BASE_FEE_PER_GAS,
                    BlockField.DIFFICULTY,
                    BlockField.SIZE,
                ]
            ),
            max_num_transactions=1000,  # Limit for performance
            max_num_blocks=20
        )
        
        # Fetch the data
        res = await client.get(query)
        
        # Process blocks for metrics with enhanced data
        new_blocks = []
        for block in res.data.blocks:
            block_number = int(block.number, 16) if isinstance(block.number, str) else block.number
            timestamp = int(block.timestamp, 16) if isinstance(block.timestamp, str) else block.timestamp
            gas_used = int(block.gas_used, 16) if hasattr(block, 'gas_used') and isinstance(block.gas_used, str) else getattr(block, 'gas_used', 0)
            gas_limit = int(block.gas_limit, 16) if hasattr(block, 'gas_limit') and isinstance(block.gas_limit, str) else getattr(block, 'gas_limit', 0)
            base_fee = int(block.base_fee_per_gas, 16) if hasattr(block, 'base_fee_per_gas') and isinstance(block.base_fee_per_gas, str) else getattr(block, 'base_fee_per_gas', 0)
            difficulty = int(block.difficulty, 16) if hasattr(block, 'difficulty') and isinstance(block.difficulty, str) else getattr(block, 'difficulty', 0)
            size = int(block.size, 16) if hasattr(block, 'size') and isinstance(block.size, str) else getattr(block, 'size', 0)
            
            block_info = {
                'number': block_number,
                'timestamp': timestamp,
                'hash': block.hash,
                'parent_hash': getattr(block, 'parent_hash', ''),
                'miner': getattr(block, 'miner', ''),
                'gas_used': gas_used,
                'gas_limit': gas_limit,
                'base_fee_per_gas': base_fee,
                'difficulty': difficulty,
                'size': size,
                'gas_utilization': (gas_used / gas_limit * 100) if gas_limit > 0 else 0,
                'transaction_count': len([tx for tx in res.data.transactions if 
                    (int(tx.block_number, 16) if isinstance(tx.block_number, str) else tx.block_number) == block_number])
            }
            
            # Add to block cache (keep last 50 blocks for better metrics)
            if not any(b['number'] == block_number for b in block_cache):
                new_blocks.append(block_info)
        
        # Update block cache with new blocks, sorted by block number (newest first)
        block_cache = sorted(new_blocks + block_cache, key=lambda x: x['number'], reverse=True)[:50]
        
        # Process transactions with enhanced data
        new_transactions = []
        for tx in res.data.transactions:
            tx_block_number = int(tx.block_number, 16) if isinstance(tx.block_number, str) else tx.block_number
            
            # Find the corresponding block for timestamp
            block_timestamp = time.time()  # Default to current time
            for block in block_cache:
                if block['number'] == tx_block_number:
                    block_timestamp = block['timestamp']
                    break
            
            # Enhanced transaction data with more fields
            gas_used = int(tx.gas_used, 16) if hasattr(tx, 'gas_used') and isinstance(tx.gas_used, str) else getattr(tx, 'gas_used', 0)
            gas_price = int(tx.gas_price, 16) if hasattr(tx, 'gas_price') and isinstance(tx.gas_price, str) else getattr(tx, 'gas_price', 0)
            value = int(tx.value, 16) if isinstance(tx.value, str) else tx.value
            nonce = int(tx.nonce, 16) if hasattr(tx, 'nonce') and isinstance(tx.nonce, str) else getattr(tx, 'nonce', 0)
            cumulative_gas_used = int(tx.cumulative_gas_used, 16) if hasattr(tx, 'cumulative_gas_used') and isinstance(tx.cumulative_gas_used, str) else getattr(tx, 'cumulative_gas_used', 0)
            
            new_transactions.append({
                'hash': tx.hash,
                'from': tx.from_address if hasattr(tx, 'from_address') else tx.from_,
                'to': tx.to,
                'value': str(value),  # Keep as string to avoid precision loss
                'blockNumber': tx_block_number,
                'timestamp': block_timestamp,
                'transactionIndex': getattr(tx, 'transaction_index', 0),
                'gasUsed': gas_used,
                'gasPrice': gas_price,
                'nonce': nonce,
                'cumulativeGasUsed': cumulative_gas_used,
                'status': getattr(tx, 'status', 1),
                'input': getattr(tx, 'input', '0x'),
                'type': getattr(tx, 'kind', 0),
                'gasFee': gas_used * gas_price,  # Calculate total gas fee
                'isContract': len(getattr(tx, 'input', '0x')) > 2,  # Simple contract detection
            })
        
        # Update transaction cache, keeping only unique transactions
        existing_hashes = {tx['hash'] for tx in transaction_cache}
        unique_new_transactions = [tx for tx in new_transactions if tx['hash'] not in existing_hashes]
        
        transaction_cache = unique_new_transactions + transaction_cache
        transaction_cache = transaction_cache[:500]  # Keep last 500 transactions
        
        if latest_block_number > last_block_number:
            last_block_number = latest_block_number
        
        # Update metrics with new data
        calculate_metrics()
            
    except Exception as e:
        print(f"Error updating transaction cache: {e}")
        import traceback
        traceback.print_exc()

# Synchronous wrapper for update_transaction_cache
def update_cache_sync():
    run_async(update_transaction_cache())

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    from_block = int(request.args.get('fromBlock', 0))
    limit = request.args.get('limit')
    
    # If no limit provided, default to 10
    # If limit is 'all', return all transactions (with a safety max)
    if limit is None:
        limit = 10
    elif limit == 'all':
        limit = 1000  # Safety maximum to prevent server overload
    else:
        limit = int(limit)
        # Enforce maximum limit for safety
        limit = min(limit, 1000)
    
    # Update cache before serving
    update_cache_sync()
    
    # Filter transactions
    filtered_txs = [tx for tx in transaction_cache if tx['blockNumber'] >= from_block]
    
    # Pagination
    paginated_txs = filtered_txs[:limit]
    
    # Calculate next block
    next_block = from_block
    if paginated_txs:
        next_block = max(tx['blockNumber'] for tx in paginated_txs) + 1
    
    return jsonify({
        'status': 'success',
        'data': {
            'transactions': paginated_txs,
            'pagination': {
                'nextBlock': next_block,
                'hasMore': len(filtered_txs) > limit
            }
        }
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    try:
        latest_block = run_async(client.get_height())
        calculate_metrics()  # Update metrics
        
        return jsonify({
            'status': 'success',
            'data': {
                'connected': True,
                'latestBlock': latest_block,
                'cacheSize': len(transaction_cache),
                'metrics': current_metrics
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/latest-transaction', methods=['GET'])
def get_latest_transaction():
    """Get the most recent single transaction"""
    # Update cache before serving
    update_cache_sync()
    
    if not transaction_cache:
        return jsonify({
            'status': 'success',
            'data': {
                'transaction': None
            }
        })
    
    # Return the most recent transaction
    latest_tx = transaction_cache[0]
    
    return jsonify({
        'status': 'success',
        'data': {
            'transaction': latest_tx
        }
    })

def calculate_metrics():
    global current_metrics, block_cache, transaction_cache
    
    try:
        current_time = time.time()
        
        # Enhanced real-time TPS calculation with multiple timeframes
        # Calculate TPS for last 10 seconds (most real-time)
        recent_10s = [tx for tx in transaction_cache if tx.get('timestamp', 0) > current_time - 10]
        tps_10s = len(recent_10s) / 10 if recent_10s else 0
        
        # Calculate TPS for last 30 seconds (medium-term)
        recent_30s = [tx for tx in transaction_cache if tx.get('timestamp', 0) > current_time - 30]
        tps_30s = len(recent_30s) / 30 if recent_30s else 0
        
        # Calculate TPS for last 60 seconds (long-term)
        recent_60s = [tx for tx in transaction_cache if tx.get('timestamp', 0) > current_time - 60]
        tps_60s = len(recent_60s) / 60 if recent_60s else 0
        
        # Use weighted average favoring recent activity
        if tps_10s > 0:
            tps = tps_10s * 0.6 + tps_30s * 0.3 + tps_60s * 0.1
        elif tps_30s > 0:
            tps = tps_30s * 0.7 + tps_60s * 0.3
        else:
            tps = tps_60s
        
        # Calculate block production rate (blocks per minute)
        recent_blocks = [block for block in block_cache if block.get('timestamp', 0) > current_time - 300]  # Last 5 minutes
        blocks_per_minute = len(recent_blocks) / 5 if recent_blocks else 0
        
        # Calculate average block time with better precision
        if len(block_cache) >= 2:
            time_diffs = []
            for i in range(1, min(len(block_cache), 10)):  # Use last 10 blocks
                if 'timestamp' in block_cache[i-1] and 'timestamp' in block_cache[i]:
                    time_diff = block_cache[i-1]['timestamp'] - block_cache[i]['timestamp']
                    if time_diff > 0:
                        time_diffs.append(time_diff)
            
            avg_block_time = sum(time_diffs) / len(time_diffs) if time_diffs else 0
        else:
            avg_block_time = 0
        
        # Get current block height
        latest_block = run_async(client.get_height())
        
        # Estimate validators (this is a rough estimate since we don't have direct access)
        # In a real scenario, you'd query the network for validator set
        estimated_validators = 100  # Placeholder - Monad testnet typically has around this many
        
        current_metrics.update({
            'tps': round(tps, 2),
            'tps_10s': round(tps_10s, 2),
            'tps_30s': round(tps_30s, 2),
            'tps_60s': round(tps_60s, 2),
            'blocks_per_minute': round(blocks_per_minute, 2),
            'block_height': latest_block,
            'validators': estimated_validators,
            'avg_block_time': round(avg_block_time, 2),
            'network_activity': 'High' if tps > 5 else 'Medium' if tps > 1 else 'Low'
        })
        
    except Exception as e:
        print(f"Error calculating metrics: {e}")

@app.route('/api/metrics', methods=['GET'])
def get_blockchain_metrics():
    """Get blockchain metrics like TPS, validators, block height"""
    try:
        # Update metrics if they're stale (older than 10 seconds)
        current_time = time.time()
        global last_metrics_update
        
        if current_time - last_metrics_update > 10:
            calculate_metrics()
            last_metrics_update = current_time
        
        return jsonify({
            'status': 'success',
            'data': {
                'metrics': current_metrics,
                'additional_info': {
                    'cached_transactions': len(transaction_cache),
                    'cached_blocks': len(block_cache),
                    'last_updated': last_metrics_update
                }
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/transactions/by-address/<address>', methods=['GET'])
def get_transactions_by_address(address):
    """Get transactions filtered by address (as sender or receiver)"""
    try:
        limit = int(request.args.get('limit', 50))
        limit = min(limit, 500)  # Safety limit
        
        # Update cache first
        update_cache_sync()
        
        # Filter transactions by address
        filtered_txs = [
            tx for tx in transaction_cache 
            if tx.get('from', '').lower() == address.lower() or tx.get('to', '').lower() == address.lower()
        ]
        
        # Apply limit
        result_txs = filtered_txs[:limit]
        
        return jsonify({
            'status': 'success',
            'data': {
                'address': address,
                'transactions': result_txs,
                'total_found': len(filtered_txs),
                'returned': len(result_txs)
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/transactions/large-value', methods=['GET'])
def get_large_value_transactions():
    """Get transactions with value above a threshold"""
    try:
        # Default to 1 ETH equivalent (in wei)
        min_value = int(request.args.get('min_value', str(10**18)))
        limit = int(request.args.get('limit', 20))
        limit = min(limit, 100)  # Safety limit
        
        # Update cache first
        update_cache_sync()
        
        # Filter transactions by value
        filtered_txs = [
            tx for tx in transaction_cache 
            if int(tx.get('value', 0)) >= min_value
        ]
        
        # Sort by value (descending)
        filtered_txs.sort(key=lambda x: int(x.get('value', 0)), reverse=True)
        
        # Apply limit
        result_txs = filtered_txs[:limit]
        
        return jsonify({
            'status': 'success',
            'data': {
                'min_value_wei': str(min_value),
                'transactions': result_txs,
                'total_found': len(filtered_txs),
                'returned': len(result_txs)
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/blocks/recent', methods=['GET'])
def get_recent_blocks():
    """Get recent blocks with detailed information"""
    try:
        limit = int(request.args.get('limit', 10))
        limit = min(limit, 50)  # Safety limit
        
        # Update cache first
        update_cache_sync()
        
        # Get recent blocks
        recent_blocks = block_cache[:limit]
        
        return jsonify({
            'status': 'success',
            'data': {
                'blocks': recent_blocks,
                'returned': len(recent_blocks)
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

async def get_advanced_transaction_data(from_block, to_block, address_filter=None, min_value=None):
    """Advanced query function using HyperSync best practices"""
    try:
        # Build transaction filter based on parameters
        transaction_selection = []
        
        if address_filter:
            # Filter by address (either from or to)
            transaction_selection.append({
                "from": [address_filter]
            })
            transaction_selection.append({
                "to": [address_filter]
            })
        
        if min_value:
            # Filter by minimum value
            transaction_selection.append({
                "value": {"gte": str(min_value)}
            })
        
        # If no specific filters, get all transactions
        if not transaction_selection:
            transaction_selection = [{}]
        
        # Enhanced query with conditional filtering
        query = hypersync.Query(
            from_block=from_block,
            to_block=to_block,
            transactions=transaction_selection,
            field_selection=hypersync.FieldSelection(
                transaction=[
                    TransactionField.HASH,
                    TransactionField.FROM,
                    TransactionField.TO,
                    TransactionField.VALUE,
                    TransactionField.BLOCK_NUMBER,
                    TransactionField.TRANSACTION_INDEX,
                    TransactionField.GAS_USED,
                    TransactionField.GAS_PRICE,
                    TransactionField.STATUS,
                    TransactionField.INPUT,
                    TransactionField.KIND,
                    TransactionField.NONCE,
                ]
            ),
            max_num_transactions=1000
        )
        
        res = await client.get(query)
        return res.data.transactions
        
    except Exception as e:
        print(f"Error in advanced query: {e}")
        return []

@app.route('/api/search/advanced', methods=['POST'])
def advanced_transaction_search():
    """Advanced transaction search with multiple filters"""
    try:
        data = request.get_json()
        
        from_block = data.get('fromBlock', last_block_number - 100)
        to_block = data.get('toBlock', last_block_number + 1)
        address_filter = data.get('address')
        min_value = data.get('minValue')
        
        # Run advanced query
        transactions = run_async(get_advanced_transaction_data(
            from_block, to_block, address_filter, min_value
        ))
        
        # Process results
        processed_txs = []
        for tx in transactions:
            processed_txs.append({
                'hash': tx.hash,
                'from': tx.from_address if hasattr(tx, 'from_address') else tx.from_,
                'to': tx.to,
                'value': str(int(tx.value, 16) if isinstance(tx.value, str) else tx.value),
                'blockNumber': int(tx.block_number, 16) if isinstance(tx.block_number, str) else tx.block_number,
                'gasUsed': int(tx.gas_used, 16) if hasattr(tx, 'gas_used') and isinstance(tx.gas_used, str) else getattr(tx, 'gas_used', 0),
                'gasPrice': int(tx.gas_price, 16) if hasattr(tx, 'gas_price') and isinstance(tx.gas_price, str) else getattr(tx, 'gas_price', 0),
                'status': getattr(tx, 'status', 1),
            })
        
        return jsonify({
            'status': 'success',
            'data': {
                'transactions': processed_txs,
                'query_params': {
                    'fromBlock': from_block,
                    'toBlock': to_block,
                    'address': address_filter,
                    'minValue': min_value
                },
                'total_results': len(processed_txs)
            }
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    print("Starting Enhanced Monad Tracker API server on http://localhost:3001")
    print("API endpoints:")
    print("  - GET /api/init (call this first)")
    print("  - GET /api/transactions?fromBlock=0&limit=10")
    print("  - GET /api/transactions/by-address/<address>?limit=50")
    print("  - GET /api/transactions/large-value?min_value=1000000000000000000&limit=20")
    print("  - GET /api/blocks/recent?limit=10")
    print("  - POST /api/search/advanced (JSON body with search parameters)")
    print("  - GET /api/metrics (blockchain statistics)")
    print("  - GET /api/status")
    print("  - GET /api/latest-transaction")
    print("\nAdvanced Features:")
    print("  - Enhanced block data with gas utilization, difficulty, size")
    print("  - Transaction filtering by address, value, and other criteria")
    print("  - Optimized HyperSync queries with proper field selection")
    print("  - Additional network metrics and statistics")
    
    # Initialize client on startup
    initialize_client()
    
    # Run with Flask's built-in server
    port = int(os.environ.get("PORT", 3001))
    app.run(host="0.0.0.0", port=port, debug=False)

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
    'tps_10s': 0,
    'tps_30s': 0,
    'tps_60s': 0,
    'tps_5min': 0,
    'blocks_per_minute': 0,
    'block_height': 0,
    'validators': 0,  # This will be estimated or fetched if available
    'avg_block_time': 0,
    'avg_gas_price': 0,  # Average gas price in wei
    'avg_gas_price_gwei': 0,  # Average gas price in gwei
    'network_activity': 'Low'
}

# Initialize the client
client = hypersync.HypersyncClient(client_config)

# Helper function to run async code in a synchronous context
def run_async(coroutine):
    try:
        # Check if there's already a running loop
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If there's already a running loop, we can't use run_until_complete
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coroutine)
                return future.result()
        else:
            # No running loop, safe to use run_until_complete
            return loop.run_until_complete(coroutine)
    except RuntimeError:
        # No event loop in current thread, create a new one
        return asyncio.run(coroutine)

# In newer Flask versions, we need to initialize as part of app context
def initialize_client():
    global client
    try:
        print("HypersyncClient initialized.")
        
        # Don't populate initial cache automatically to avoid async issues
        # run_async(update_transaction_cache())
        print("Skipping initial cache population to avoid async conflicts")
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
        # Increase block range to capture more transactions per update
        blocks_to_fetch = 20  # Increased from 10 to get more transactions
        query = hypersync.Query(
            from_block=max(0, latest_block_number - blocks_to_fetch),  # Get last 20 blocks for better context
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
            max_num_transactions=2000,  # Increased limit to handle more transactions per block
            max_num_blocks=30  # Increased to match our block range
        )
        
        # Fetch the data
        res = await client.get(query)
        
        # Process blocks for metrics with enhanced data
        new_blocks = []
        block_timestamp_map = {}  # Create a map for quick timestamp lookup
        for block in res.data.blocks:
            block_number = int(block.number, 16) if isinstance(block.number, str) else block.number
            timestamp = int(block.timestamp, 16) if isinstance(block.timestamp, str) else block.timestamp
            gas_used = int(block.gas_used, 16) if hasattr(block, 'gas_used') and isinstance(block.gas_used, str) else getattr(block, 'gas_used', 0)
            gas_limit = int(block.gas_limit, 16) if hasattr(block, 'gas_limit') and isinstance(block.gas_limit, str) else getattr(block, 'gas_limit', 0)
            base_fee = int(block.base_fee_per_gas, 16) if hasattr(block, 'base_fee_per_gas') and isinstance(block.base_fee_per_gas, str) else getattr(block, 'base_fee_per_gas', 0)
            difficulty = int(block.difficulty, 16) if hasattr(block, 'difficulty') and isinstance(block.difficulty, str) else getattr(block, 'difficulty', 0)
            size = int(block.size, 16) if hasattr(block, 'size') and isinstance(block.size, str) else getattr(block, 'size', 0)
            
            # Store timestamp for quick lookup
            block_timestamp_map[block_number] = timestamp
            
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
            
            # Find the corresponding block timestamp from current response or cache
            block_timestamp = block_timestamp_map.get(tx_block_number)
            if block_timestamp is None:
                # Fallback to cache if not in current response
                for block in block_cache:
                    if block['number'] == tx_block_number:
                        block_timestamp = block['timestamp']
                        break
                else:
                    # If still not found, use current time as last resort
                    block_timestamp = time.time()
                    print(f"Warning: Could not find timestamp for block {tx_block_number}, using current time")
            
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
    to_block = request.args.get('toBlock')  # New parameter for block range
    limit = request.args.get('limit')
    get_all_from_block = request.args.get('getAllFromBlock', 'false').lower() == 'true'  # New parameter
    
    # If no limit provided, default to 10
    # If limit is 'all', return all transactions (with a safety max)
    # If getAllFromBlock is true, get all transactions from the specified block onwards
    if limit is None:
        limit = 10 if not get_all_from_block else 1000
    elif limit == 'all' or get_all_from_block:
        limit = 1000  # Safety maximum to prevent server overload
    else:
        limit = int(limit)
        # Enforce maximum limit for safety
        limit = min(limit, 1000)
    
    # Update cache before serving
    update_cache_sync()
    
    # Filter transactions by block range
    if to_block is not None:
        to_block = int(to_block)
        filtered_txs = [
            tx for tx in transaction_cache 
            if from_block <= tx['blockNumber'] <= to_block
        ]
    else:
        filtered_txs = [tx for tx in transaction_cache if tx['blockNumber'] >= from_block]
    
    # If getAllFromBlock is true, return all transactions from the specified block
    if get_all_from_block:
        paginated_txs = filtered_txs
    else:
        # Normal pagination
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
                'hasMore': len(filtered_txs) > len(paginated_txs),
                'totalFound': len(filtered_txs),
                'returned': len(paginated_txs)
            },
            'query_info': {
                'fromBlock': from_block,
                'toBlock': to_block,
                'getAllFromBlock': get_all_from_block
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
        }, 500)

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
        # Use the new HyperSync-based TPS calculation (now with 100 blocks)
        tps_data = run_async(calculate_tps_from_hypersync())
        tps = tps_data['tps']
        tps_10s = tps_data['tps_10s'] 
        tps_30s = tps_data['tps_30s']
        tps_60s = tps_data['tps_60s']
        tps_5min = tps_data['tps_5min']
        
        print(f"Updated TPS calculation (100 blocks) - Final: {tps:.2f}")
        print(f"  10s: {tps_10s:.2f}, 30s: {tps_30s:.2f}, 60s: {tps_60s:.2f}, 5min: {tps_5min:.2f}")
        
        current_time = time.time()
        
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
        
        # Calculate average gas price from recent transactions (use transaction cache)
        gas_prices = []
        for tx in transaction_cache[:50]:  # Use recent transactions from cache
            gas_price = tx.get('gasPrice', 0)
            if gas_price and gas_price > 0:
                gas_prices.append(gas_price)
        
        avg_gas_price = sum(gas_prices) / len(gas_prices) if gas_prices else 0
        avg_gas_price_gwei = avg_gas_price / 1e9 if avg_gas_price > 0 else 0  # Convert wei to gwei
        
        current_metrics.update({
            'tps': round(tps, 2),
            'tps_10s': round(tps_10s, 2),
            'tps_30s': round(tps_30s, 2),
            'tps_60s': round(tps_60s, 2),
            'tps_5min': round(tps_5min, 2),
            'blocks_per_minute': round(blocks_per_minute, 2),
            'block_height': latest_block,
            'validators': estimated_validators,
            'avg_block_time': round(avg_block_time, 2),
            'avg_gas_price': round(avg_gas_price, 0),  # Gas price in wei
            'avg_gas_price_gwei': round(avg_gas_price_gwei, 2),  # Gas price in gwei
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
        # Default to 1 MON equivalent (in wei)
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

@app.route('/api/transactions/latest', methods=['GET'])
def get_latest_transactions():
    """Get all transactions from the latest blocks"""
    try:
        # Parameters
        num_blocks = int(request.args.get('blocks', 3))  # Default to last 3 blocks
        num_blocks = min(num_blocks, 10)  # Safety limit
        
        # Update cache before serving
        update_cache_sync()
        
        if not transaction_cache:
            return jsonify({
                'status': 'success',
                'data': {
                    'transactions': [],
                    'blocks_scanned': 0,
                    'latest_block': 0
                }
            })
        
        # Get the latest block number from our cache
        latest_block = max(tx['blockNumber'] for tx in transaction_cache)
        from_block = max(0, latest_block - num_blocks + 1)
        
        # Filter transactions from the latest blocks
        latest_txs = [
            tx for tx in transaction_cache 
            if tx['blockNumber'] >= from_block
        ]
        
        # Sort by block number (newest first), then by transaction index
        latest_txs = sorted(
            latest_txs, 
            key=lambda x: (x['blockNumber'], x.get('transactionIndex', 0)), 
            reverse=True
        )
        
        return jsonify({
            'status': 'success',
            'data': {
                'transactions': latest_txs,
                'blocks_scanned': num_blocks,
                'latest_block': latest_block,
                'from_block': from_block,
                'total_transactions': len(latest_txs)
            }
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

async def calculate_tps_from_hypersync():
    """
    Calculate TPS directly from HyperSync using block-based approach
    This is more accurate and efficient than tracking individual transactions
    """
    try:
        # Get current block height
        latest_block_number = await client.get_height()
        
        # Query blocks from the last 100 blocks for TPS calculation
        # This gives us enough data for 10s, 30s, 60s intervals and even longer periods
        blocks_for_tps = 100  # Use last 100 blocks for comprehensive TPS calculation
        
        query = hypersync.Query(
            from_block=max(0, latest_block_number - blocks_for_tps),
            to_block=latest_block_number + 1,
            blocks=[{}],  # Get all blocks
            transactions=[{}],  # Also get transactions to count them per block
            field_selection=hypersync.FieldSelection(
                block=[
                    BlockField.NUMBER,
                    BlockField.TIMESTAMP,
                ],
                transaction=[
                    TransactionField.BLOCK_NUMBER,
                ]
            ),
            max_num_blocks=blocks_for_tps + 10,
            max_num_transactions=10000  # Increased limit for 100 blocks
        )
        
        res = await client.get(query)
        current_time = time.time()
        
        # Count transactions per block
        tx_count_per_block = {}
        for tx in res.data.transactions:
            block_num = int(tx.block_number, 16) if isinstance(tx.block_number, str) else tx.block_number
            tx_count_per_block[block_num] = tx_count_per_block.get(block_num, 0) + 1
        
        # Process blocks for TPS calculation
        tps_blocks = []
        for block in res.data.blocks:
            block_number = int(block.number, 16) if isinstance(block.number, str) else block.number
            timestamp = int(block.timestamp, 16) if isinstance(block.timestamp, str) else block.timestamp
            tx_count = tx_count_per_block.get(block_number, 0)
            
            tps_blocks.append({
                'number': block_number,
                'timestamp': timestamp,
                'transaction_count': tx_count
            })
        
        # Sort by timestamp (newest first)
        tps_blocks.sort(key=lambda x: x['timestamp'], reverse=True)
        
        def calculate_interval_tps(seconds):
            cutoff_time = current_time - seconds
            recent_blocks = [b for b in tps_blocks if b['timestamp'] > cutoff_time]
            
            if len(recent_blocks) < 2:
                return 0
            
            # Calculate actual time span
            oldest_block = min(recent_blocks, key=lambda x: x['timestamp'])
            newest_block = max(recent_blocks, key=lambda x: x['timestamp'])
            time_span = newest_block['timestamp'] - oldest_block['timestamp']
            
            if time_span <= 0:
                return 0
            
            total_transactions = sum(block['transaction_count'] for block in recent_blocks)
            return total_transactions / time_span
        
        # Calculate TPS for different intervals
        tps_10s = calculate_interval_tps(10)
        tps_30s = calculate_interval_tps(30)
        tps_60s = calculate_interval_tps(60)
        tps_5min = calculate_interval_tps(300)  # 5 minutes for longer-term average
        
        # Weighted average - now includes 5-minute data for more stability
        if tps_10s > 0:
            final_tps = tps_10s * 0.5 + tps_30s * 0.25 + tps_60s * 0.15 + tps_5min * 0.1
        elif tps_30s > 0:
            final_tps = tps_30s * 0.6 + tps_60s * 0.25 + tps_5min * 0.15
        elif tps_60s > 0:
            final_tps = tps_60s * 0.7 + tps_5min * 0.3
        else:
            final_tps = tps_5min
        
        print(f"HyperSync TPS - Blocks analyzed: {len(tps_blocks)} (last 100 blocks)")
        print(f"HyperSync TPS - 10s: {tps_10s:.2f}, 30s: {tps_30s:.2f}, 60s: {tps_60s:.2f}, 5min: {tps_5min:.2f}")
        print(f"HyperSync TPS - Final weighted: {final_tps:.2f}")
        
        if len(tps_blocks) >= 2:
            time_span_total = tps_blocks[0]['timestamp'] - tps_blocks[-1]['timestamp']
            total_tx = sum(block['transaction_count'] for block in tps_blocks)
            print(f"HyperSync TPS - Total time span: {time_span_total:.1f}s, Total transactions: {total_tx}")
        
        return {
            'tps': round(final_tps, 2),
            'tps_10s': round(tps_10s, 2),
            'tps_30s': round(tps_30s, 2),
            'tps_60s': round(tps_60s, 2),
            'tps_5min': round(tps_5min, 2)
        }
        
    except Exception as e:
        print(f"Error calculating TPS from HyperSync: {e}")
        import traceback
        traceback.print_exc()
        return {
            'tps': 0,
            'tps_10s': 0,
            'tps_30s': 0,
            'tps_60s': 0,
            'tps_5min': 0
        }

if __name__ == '__main__':
    print("Starting Monad Visualizer Backend Server...")
    print("Server will be available at http://localhost:3001")
    print("Available endpoints:")
    for rule in app.url_map.iter_rules():
        if rule.rule.startswith('/api/'):
            print(f"  {rule.rule}")
    print("=" * 50)
    
    try:
        # Initialize the cache on startup
        print("Initializing transaction cache...")
        update_cache_sync()
        print("Cache initialized successfully!")
        
        # Start the Flask server
        app.run(host='0.0.0.0', port=3001, debug=True)
    except Exception as e:
        print(f"Error starting server: {e}")
        import traceback
        traceback.print_exc()

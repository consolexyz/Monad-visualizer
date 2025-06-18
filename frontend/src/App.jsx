import { useEffect, useState } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextBlock, setNextBlock] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lastProcessedBlock, setLastProcessedBlock] = useState(0);
  const [metrics, setMetrics] = useState({
    tps: 0,
    tps_10s: 0,
    tps_30s: 0,
    tps_60s: 0,
    blocks_per_minute: 0,
    block_height: 0,
    validators: 0,
    avg_block_time: 0,
    network_activity: 'Low'
  });
  const [recentBlocks, setRecentBlocks] = useState([]);
  const [searchAddress, setSearchAddress] = useState('');
  const [addressTransactions, setAddressTransactions] = useState([]);

  // Function to fetch individual transactions
  async function fetchNewTransactions() {
    try {
      const response = await fetch(`${API_URL}/api/transactions?fromBlock=${lastProcessedBlock}&limit=1`);
      if (!response.ok) throw new Error('Failed to fetch transactions');

      const result = await response.json();

      if (result.status === 'success' && result.data && result.data.transactions.length > 0) {
        const newTx = result.data.transactions[0];

        // Add new transaction to the beginning of the list
        setTransactions(prev => {
          const existingHashes = prev.map(tx => tx.hash);
          if (!existingHashes.includes(newTx.hash)) {
            return [newTx, ...prev.slice(0, 99)]; // Keep only 100 transactions max for full screen
          }
          return prev;
        });

        setLastProcessedBlock(newTx.blockNumber);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching new transactions:', err);
      setError(err.message);
    }
  }

  // Function to fetch initial batch of transactions
  async function fetchTransactions(fromBlock = 0) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/transactions?fromBlock=${fromBlock}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch transactions');

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        setTransactions(prev => fromBlock === 0 ? result.data.transactions : [...prev, ...result.data.transactions]);
        setNextBlock(result.data.pagination.nextBlock);
        setHasMore(result.data.pagination.hasMore);
        setLastUpdated(new Date());

        // Set the initial last processed block
        if (result.data.transactions.length > 0) {
          setLastProcessedBlock(Math.max(...result.data.transactions.map(tx => tx.blockNumber)));
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Function to fetch blockchain metrics
  async function fetchMetrics() {
    try {
      const response = await fetch(`${API_URL}/api/metrics`);
      if (!response.ok) throw new Error('Failed to fetch metrics');

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        setMetrics(result.data.metrics);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  }

  // Function to fetch recent blocks
  async function fetchRecentBlocks() {
    try {
      const response = await fetch(`${API_URL}/api/blocks/recent?limit=5`);
      if (!response.ok) throw new Error('Failed to fetch blocks');

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        setRecentBlocks(result.data.blocks);
      }
    } catch (err) {
      console.error('Error fetching blocks:', err);
    }
  }

  // Function to search transactions by address
  async function searchByAddress() {
    if (!searchAddress) return;

    try {
      const response = await fetch(`${API_URL}/api/transactions/by-address/${searchAddress}?limit=20`);
      if (!response.ok) throw new Error('Failed to search transactions');

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        setAddressTransactions(result.data.transactions);
      }
    } catch (err) {
      console.error('Error searching transactions:', err);
    }
  }

  useEffect(() => {
    // Initial fetch of transactions and metrics
    fetchTransactions();
    fetchMetrics();
    fetchRecentBlocks();

    // Set up more frequent polling for TPS updates
    const newTxInterval = setInterval(() => {
      fetchNewTransactions();
    }, 1000); // Check for new transactions every 1 second for more real-time TPS

    // Set up polling for metrics (more frequent for real-time TPS)
    const metricsInterval = setInterval(() => {
      fetchMetrics();
      fetchRecentBlocks();
    }, 3000); // Update metrics every 3 seconds for better real-time feel

    return () => {
      clearInterval(newTxInterval);
      clearInterval(metricsInterval);
    };
  }, []);

  const loadMore = () => {
    if (hasMore) {
      fetchTransactions(nextBlock);
    }
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatValue = (value) => {
    const num = Number(value) / 1e18; // Convert from wei to ETH
    return num.toFixed(6) + ' MON';
  };

  // Generate random position and color for each transaction (within section bounds)
  const generateDotStyle = (tx, index) => {
    // Use transaction hash to generate consistent random values
    const hash = tx.hash;
    const hashInt = parseInt(hash.substring(2, 10), 16);

    // Generate random position within the dots section (not full screen)
    const x = (hashInt % 90) + 5; // 5% to 95% within the container
    const y = ((hashInt * 7) % 85) + 5; // 5% to 90% within the container

    // Generate different colors based on transaction properties
    const colors = [
      '#3b82f6', // Blue
      '#10b981', // Green
      '#f59e0b', // Orange
      '#ef4444', // Red
      '#8b5cf6', // Purple
      '#06b6d4', // Cyan
      '#f97316', // Orange
      '#84cc16', // Lime
      '#ec4899', // Pink
      '#6366f1', // Indigo
    ];

    const colorIndex = (parseInt(hash.substring(10, 12), 16)) % colors.length;
    const color = colors[colorIndex];

    // Different sizes based on transaction value
    const value = parseFloat(tx.value) || 0;
    const size = Math.min(Math.max(8 + (value / 1e18) * 10, 8), 25); // 8px to 25px

    return {
      position: 'absolute', // Changed from 'fixed' to 'absolute'
      left: `${x}%`,
      top: `${y}%`,
      backgroundColor: color,
      width: `${size}px`,
      height: `${size}px`,
      zIndex: 100 + index, // Newer transactions on top
      animationDelay: `${index * 0.1}s`
    };
  };

  return (
    <div className="App">
      <header>
        <h1>Monad Testnet Explorer</h1>
        <p>Transactions from the Monad testnet - {transactions.length} live dots</p>
        {lastUpdated && (
          <p className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </header>

      {/* Enhanced Blockchain Metrics Section */}
      <div className="metrics-section">
        <h2>Real-Time Network Analytics</h2>

        {/* TPS Dashboard */}
        <div className="tps-dashboard">
          <div className="tps-main-card">
            <div className="tps-main-value">{metrics.tps}</div>
            <div className="tps-main-label">TPS</div>
            <div className="tps-activity-badge" data-activity={metrics.network_activity?.toLowerCase()}>
              {metrics.network_activity} Activity
            </div>
            <div className="tps-breakdown">
              <div className="tps-timeframe">
                <span className="tps-period">10s</span>
                <span className="tps-value">{metrics.tps_10s}</span>
              </div>
              <div className="tps-timeframe">
                <span className="tps-period">30s</span>
                <span className="tps-value">{metrics.tps_30s}</span>
              </div>
              <div className="tps-timeframe">
                <span className="tps-period">60s</span>
                <span className="tps-value">{metrics.tps_60s}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="metrics-grid">
          <div className="metric-card enhanced">
            <div className="metric-icon">📊</div>
            <div className="metric-value">{metrics.block_height.toLocaleString()}</div>
            <div className="metric-label">Block Height</div>
            <div className="metric-description">Current block number</div>
            <div className="metric-trend">+{metrics.blocks_per_minute.toFixed(1)}/min</div>
          </div>
          <div className="metric-card enhanced">
            <div className="metric-icon">⏱️</div>
            <div className="metric-value">{metrics.avg_block_time}s</div>
            <div className="metric-label">Block Time</div>
            <div className="metric-description">Average time between blocks</div>
            <div className="metric-trend">
              {metrics.avg_block_time < 2 ? '🟢 Fast' : metrics.avg_block_time < 5 ? '🟡 Normal' : '🔴 Slow'}
            </div>
          </div>
          <div className="metric-card enhanced">
            <div className="metric-icon">🔗</div>
            <div className="metric-value">{metrics.validators}</div>
            <div className="metric-label">Validators</div>
            <div className="metric-description">Active network validators</div>
            <div className="metric-trend">🟢 Healthy</div>
          </div>
          <div className="metric-card enhanced">
            <div className="metric-icon">📈</div>
            <div className="metric-value">{metrics.blocks_per_minute.toFixed(1)}</div>
            <div className="metric-label">Blocks/Min</div>
            <div className="metric-description">Block production rate</div>
            <div className="metric-trend">Real-time</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>Error: {error}</p>
          <button onClick={() => fetchTransactions()}>Try Again</button>
        </div>
      )}

      {/* Dedicated Transaction Dots Section */}
      <div className="transaction-dots-section">
        <h2>Live Transaction Visualization</h2>
        <div className="dots-info">
          <span className="dots-count">{transactions.length} Active Transactions</span>
          <span className="dots-legend">
            Each dot = 1 transaction • Size = Value • Color = Hash-based
          </span>
        </div>
        <div className="dots-container">
          {transactions.map((tx, index) => (
            <div
              key={tx.hash}
              className={`section-transaction-dot ${index === 0 ? 'new-transaction' : ''}`}
              style={generateDotStyle(tx, index)}
              title={`Hash: ${tx.hash.substring(0, 10)}...\nValue: ${formatValue(tx.value)}\nBlock: ${tx.blockNumber}\nFrom: ${formatAddress(tx.from)}\nTo: ${formatAddress(tx.to)}`}
            />
          ))}
          {transactions.length === 0 && (
            <div className="waiting-message">
              <div className="waiting-spinner"></div>
              <p>Waiting for transactions...</p>
            </div>
          )}
        </div>
      </div>

      {/* Address Search Section */}
      <div className="search-section">
        <h2>Transaction Search</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="Enter address (0x...)"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            className="address-input"
          />
          <button onClick={searchByAddress} className="search-button">
            Search Transactions
          </button>
        </div>

        {addressTransactions.length > 0 && (
          <div className="search-results">
            <h3>Transactions for {formatAddress(searchAddress)}</h3>
            <table>
              <thead>
                <tr>
                  <th>Hash</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Value</th>
                  <th>Block</th>
                  <th>Gas Used</th>
                </tr>
              </thead>
              <tbody>
                {addressTransactions.slice(0, 10).map((tx) => (
                  <tr key={tx.hash}>
                    <td className="hash">{formatAddress(tx.hash)}</td>
                    <td className="address">{formatAddress(tx.from)}</td>
                    <td className="address">{formatAddress(tx.to)}</td>
                    <td className="value">{formatValue(tx.value)}</td>
                    <td className="block">{tx.blockNumber}</td>
                    <td className="gas">{tx.gasUsed?.toLocaleString() || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Blocks Section */}
      <div className="blocks-section">
        <h2>Recent Blocks</h2>
        <div className="blocks-grid">
          {recentBlocks.map((block) => (
            <div key={block.number} className="block-card">
              <div className="block-number">#{block.number}</div>
              <div className="block-info">
                <div>Hash: {formatAddress(block.hash)}</div>
                <div>Txs: {block.transaction_count}</div>
                <div>Gas: {block.gas_utilization.toFixed(1)}%</div>
                <div>Size: {(block.size / 1024).toFixed(1)}KB</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="transaction-list">
        <h2>Recent Transactions</h2>

        <table>
          <thead>
            <tr>
              <th>Hash</th>
              <th>From</th>
              <th>To</th>
              <th>Value</th>
              <th>Block</th>
              <th>Gas</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {transactions.slice(0, 10).map((tx) => (
              <tr key={tx.hash}>
                <td className="hash">{formatAddress(tx.hash)}</td>
                <td className="address">{formatAddress(tx.from)}</td>
                <td className="address">{formatAddress(tx.to)}</td>
                <td className="value">{formatValue(tx.value)}</td>
                <td className="block">{tx.blockNumber}</td>
                <td className="gas">{tx.gasUsed?.toLocaleString() || 'N/A'}</td>
                <td className="type">{tx.isContract ? 'Contract' : 'Transfer'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <div className="loading">Loading transactions...</div>}

        {hasMore && !loading && (
          <button className="load-more" onClick={loadMore}>
            Load More
          </button>
        )}

        {!hasMore && transactions.length > 0 && (
          <div className="end-message">No more transactions to load</div>
        )}

        {!loading && transactions.length === 0 && !error && (
          <div className="empty-message">No transactions found</div>
        )}
      </div>
    </div>
  );
}

export default App;
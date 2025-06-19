import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, TrendingUp, Users, Clock, Search, RefreshCw, Zap, Database, Network } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Function to search for address transactions
  async function searchByAddress() {
    if (!searchAddress.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/transactions/by-address/${searchAddress}?limit=20`);
      if (!response.ok) throw new Error('Failed to fetch address transactions');

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        setAddressTransactions(result.data.transactions);
      }
    } catch (err) {
      console.error('Error searching address:', err);
    }
  }

  // Initialize and set up polling
  useEffect(() => {
    fetchTransactions();
    fetchMetrics();
    fetchRecentBlocks();

    const metricsInterval = setInterval(fetchMetrics, 10000);
    const transactionInterval = setInterval(fetchNewTransactions, 3000);
    const blocksInterval = setInterval(fetchRecentBlocks, 15000);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(transactionInterval);
      clearInterval(blocksInterval);
    };
  }, []);

  const formatHash = (hash) => `${hash?.slice(0, 6)}...${hash?.slice(-4)}`;
  const formatAddress = (addr) => `${addr?.slice(0, 6)}...${addr?.slice(-4)}`;
  const formatValue = (value) => {
    const eth = parseFloat(value) / 1e18;
    return eth < 0.01 ? `${eth.toExponential(2)} ETH` : `${eth.toFixed(4)} ETH`;
  };

  const getActivityBadgeVariant = (activity) => {
    switch (activity) {
      case 'High': return 'default';
      case 'Medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getActivityColor = (activity) => {
    switch (activity) {
      case 'High': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Network className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Monad Visualizer
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real-time blockchain explorer for Monad testnet - Monitor transactions, blocks, and network performance
          </p>
          {lastUpdated && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>

      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div className="card">
          <h3 style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>Block Height</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {metrics.block_height?.toLocaleString()}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#999' }}>Current block number</p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>TPS</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {metrics.tps?.toFixed(2)}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#999' }}>Transactions per second</p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>Validators</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {metrics.validators}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#999' }}>Active validators</p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>Block Time</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {metrics.avg_block_time?.toFixed(1)}s
          </div>
          <div style={{ marginTop: '10px' }}>
            <span className={`badge ${getActivityColor(metrics.network_activity)}`}>
              {metrics.network_activity}
            </span>
          </div>
        </div>
      </div>

      {/* Address Search */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '10px' }}>Address Search</h3>
        <p style={{ color: '#666', marginBottom: '15px' }}>Search for transactions by wallet address</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            className="input"
            placeholder="Enter wallet address (0x...)"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="button"
            onClick={searchByAddress}
            disabled={!searchAddress.trim()}
          >
            Search
          </button>
        </div>
      </div>

      {/* Recent Transactions and Blocks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Recent Transactions */}
        <div className="card">
          <h3 style={{ marginBottom: '10px' }}>Live Transactions</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>Latest transactions on the network</p>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <span>Loading transactions...</span>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {transactions.slice(0, 10).map((tx) => (
                <div key={tx.hash} style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '15px',
                  margin: '10px 0',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <span style={{
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                      color: '#007bff'
                    }}>
                      {formatHash(tx.hash)}
                    </span>
                    <span className="badge badge-default">Block {tx.blockNumber}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    <div style={{ marginBottom: '5px' }}>
                      From: <span style={{ fontFamily: 'monospace' }}>{formatAddress(tx.from)}</span>
                    </div>
                    <div style={{ marginBottom: '5px' }}>
                      To: <span style={{ fontFamily: 'monospace' }}>{formatAddress(tx.to)}</span>
                    </div>
                    <div>
                      Value: <span style={{ fontWeight: 'bold' }}>{formatValue(tx.value)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Blocks */}
        <div className="card">
          <h3 style={{ marginBottom: '10px' }}>Recent Blocks</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>Latest blocks mined on the network</p>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {recentBlocks.map((block) => (
              <div key={block.number} style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '15px',
                margin: '10px 0',
                backgroundColor: '#fafafa'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                    Block {block.number}
                  </span>
                  <span className="badge badge-default">
                    {block.transaction_count} txs
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  <div style={{ marginBottom: '5px' }}>
                    Hash: <span style={{ fontFamily: 'monospace' }}>{formatHash(block.hash)}</span>
                  </div>
                  <div>
                    Timestamp: {new Date(block.timestamp * 1000).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Address Search Results */}
      {addressTransactions.length > 0 && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '10px' }}>Address Transactions</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Transactions for address: {formatAddress(searchAddress)}
          </p>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {addressTransactions.map((tx) => (
              <div key={tx.hash} style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '15px',
                margin: '10px 0',
                backgroundColor: '#fafafa'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <span style={{
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    color: '#007bff'
                  }}>
                    {formatHash(tx.hash)}
                  </span>
                  <span className="badge badge-default">Block {tx.blockNumber}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  <div style={{ marginBottom: '5px' }}>
                    From: <span style={{ fontFamily: 'monospace' }}>{formatAddress(tx.from)}</span>
                  </div>
                  <div style={{ marginBottom: '5px' }}>
                    To: <span style={{ fontFamily: 'monospace' }}>{formatAddress(tx.to)}</span>
                  </div>
                  <div>
                    Value: <span style={{ fontWeight: 'bold' }}>{formatValue(tx.value)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card">
          <div style={{ textAlign: 'center', color: '#dc3545' }}>
            <p>Error: {error}</p>
            <button
              className="button"
              onClick={() => window.location.reload()}
              style={{ marginTop: '10px' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

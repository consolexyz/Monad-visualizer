import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Clock,
  RefreshCw,
  Zap,
  Database,
  Network,
  BarChart3,
  Gauge,
  Shield,
  Blocks,
  Github,
  Plus,
  Fuel
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Overview Tab Component
function OverviewTab({ metrics, recentBlocks, formatHash }) {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg p-8 text-white">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold mb-4">Monad Network Overview</h1>
          <p className="text-lg opacity-90 mb-6">
            Real-time insights into the Monad blockchain network performance, transactions, and activity.
          </p>
        </div>
      </div>

      {/* Network Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Network Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Block Height
              </CardTitle>
              <Blocks className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.block_height?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Current block number
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Transactions/Sec
              </CardTitle>
              <Gauge className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.tps?.toFixed(2) || '0.00'}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>10s: {metrics.tps_10s?.toFixed(1)}</span>
                <span>30s: {metrics.tps_30s?.toFixed(1)}</span>
                <span>60s: {metrics.tps_60s?.toFixed(1)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Validators
              </CardTitle>
              <Shield className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.validators || '0'}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Network validators
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Block Time
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.avg_block_time?.toFixed(1) || '0.0'}s
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={metrics.network_activity === 'High' ? 'default' : metrics.network_activity === 'Medium' ? 'secondary' : 'outline'}
                  className={metrics.network_activity === 'High' ? 'text-green-600' : metrics.network_activity === 'Medium' ? 'text-yellow-600' : 'text-gray-600'}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {metrics.network_activity} Activity
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Recent Blocks
              <Badge variant="secondary" className="ml-auto">
                {recentBlocks.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Latest blocks mined on the network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentBlocks.slice(0, 5).map((block, index) => (
                <div
                  key={block.number}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Blocks className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Block #{block.number}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {block.transaction_count} transactions
                      </div>
                    </div>
                  </div>
                  {index === 0 && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Network Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-green-500" />
              Network Status
            </CardTitle>
            <CardDescription>
              Current network health and connectivity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    Monad Testnet
                  </span>
                </div>
                <Badge variant="secondary" className="text-green-600">
                  Online
                </Badge>
              </div>
              <div className="text-sm text-green-600 dark:text-green-300">
                All systems operational
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Live Transactions Tab Component  
function LiveTransactionsTab({
  displayTransactions,
  transactionQueue,
  renderingStats,
  loading,
  error,
  formatHash,
  formatAddress,
  formatValue,
  getTransactionType
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Live Transactions</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time transaction feed from the Monad network
        </p>
      </div>

      {/* Live Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            Transaction Feed
            <Badge variant="secondary" className="ml-auto">
              {displayTransactions.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Live transactions being processed on the network
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600 dark:text-gray-400">Loading transactions...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 font-medium mb-2">⚠️ Connection Error</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-left">
                    <th className="pb-3 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Hash
                    </th>
                    <th className="pb-3 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="pb-3 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Block
                    </th>
                    <th className="pb-3 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      From
                    </th>
                    <th className="pb-3 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      To
                    </th>
                    <th className="pb-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayTransactions.slice(0, 15).map((tx, index) => (
                    <tr
                      key={tx.hash}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                          )}
                          <span className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer">
                            {formatHash(tx.hash)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getTransactionType(tx) === 'Contract Creation'
                              ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200' :
                              getTransactionType(tx) === 'Contract Call'
                                ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200' :
                                'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200'
                            }`}
                        >
                          {getTransactionType(tx)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs">
                          {tx.blockNumber}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                          {formatAddress(tx.from)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                          {formatAddress(tx.to)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {formatValue(tx.value)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
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
    avg_gas_price: 0,
    avg_gas_price_gwei: 0,
    network_activity: 'Low'
  });
  const [recentBlocks, setRecentBlocks] = useState([]);

  // Dynamic Delay Function State & Queue Management
  const [transactionQueue, setTransactionQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [displayTransactions, setDisplayTransactions] = useState([]);
  const [networkLatency, setNetworkLatency] = useState(100); // Track network latency
  const [renderingStats, setRenderingStats] = useState({
    queueLength: 0,
    averageDelay: 500,
    transactionsPerSecond: 0,
    lastRenderTime: Date.now()
  });

  // Dynamic Delay Calculation Function
  const calculateDynamicDelay = (queueLength, networkLatency, tps) => {
    const BASE_DELAY = 300; // Base delay in ms
    const MIN_DELAY = 50;   // Minimum delay to prevent overwhelming
    const MAX_DELAY = 2000; // Maximum delay to prevent long pauses

    // Factor 1: Queue length (more transactions = faster rendering)
    const queueFactor = Math.max(0.2, 1 - (queueLength * 0.1));

    // Factor 2: Network TPS (higher TPS = faster rendering)
    const tpsFactor = Math.max(0.3, 1 - (tps * 0.05));

    // Factor 3: Network latency compensation
    const latencyFactor = Math.max(0.5, 1 - (networkLatency / 1000));

    // Calculate dynamic delay
    let dynamicDelay = BASE_DELAY * queueFactor * tpsFactor * latencyFactor;

    // Apply bounds
    dynamicDelay = Math.max(MIN_DELAY, Math.min(MAX_DELAY, dynamicDelay));

    return Math.round(dynamicDelay);
  };

  // Queue Processing Function
  const processTransactionQueue = async () => {
    if (isProcessingQueue || transactionQueue.length === 0) return;

    setIsProcessingQueue(true);

    while (transactionQueue.length > 0) {
      const currentTps = metrics.tps || 1;
      const delay = calculateDynamicDelay(transactionQueue.length, networkLatency, currentTps);

      // Update rendering stats
      setRenderingStats(prev => ({
        ...prev,
        queueLength: transactionQueue.length,
        averageDelay: delay,
        transactionsPerSecond: 1000 / delay,
        lastRenderTime: Date.now()
      }));

      // Move one transaction from queue to display
      setTransactionQueue(prev => {
        const [nextTx, ...rest] = prev;
        if (nextTx) {
          setDisplayTransactions(current => {
            const existing = current.find(tx => tx.hash === nextTx.hash);
            if (!existing) {
              return [nextTx, ...current.slice(0, 199)]; // Keep max 200 displayed
            }
            return current;
          });
        }
        return rest;
      });

      // Dynamic delay based on queue state
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    setIsProcessingQueue(false);
  };

  // Start queue processing when queue has items
  useEffect(() => {
    if (transactionQueue.length > 0 && !isProcessingQueue) {
      processTransactionQueue();
    }
  }, [transactionQueue.length, isProcessingQueue, metrics.tps, networkLatency]);

  // Function to fetch all new transactions from recent blocks
  async function fetchNewTransactions() {
    try {
      // Use the new latest transactions endpoint to get all transactions from recent blocks
      const response = await fetch(`${API_URL}/api/transactions/latest?blocks=3`);
      if (!response.ok) throw new Error('Failed to fetch transactions');

      const result = await response.json();

      if (result.status === 'success' && result.data && result.data.transactions.length > 0) {
        const newTransactions = result.data.transactions;

        // Add new transactions to the queue for gradual rendering
        setTransactionQueue(prev => {
          const existingQueueHashes = new Set(prev.map(tx => tx.hash));
          const existingDisplayHashes = new Set(displayTransactions.map(tx => tx.hash));

          // Filter out transactions that are already in queue or displayed
          const uniqueNewTxs = newTransactions.filter(tx =>
            !existingQueueHashes.has(tx.hash) && !existingDisplayHashes.has(tx.hash)
          );

          if (uniqueNewTxs.length > 0) {
            // Update last processed block to the highest block number we've seen
            const latestBlock = Math.max(...newTransactions.map(tx => tx.blockNumber));
            setLastProcessedBlock(latestBlock);
            setLastUpdated(new Date());

            // Add to queue for smooth rendering
            return [...prev, ...uniqueNewTxs];
          }
          return prev;
        });
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
      // For initial load, get more transactions from recent blocks
      const response = await fetch(`${API_URL}/api/transactions?fromBlock=${fromBlock}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch transactions');

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        if (fromBlock === 0) {
          // For initial load, populate display directly (no queue)
          setDisplayTransactions(result.data.transactions.slice(0, 50));
        } else {
          // For additional loads, add to queue for smooth rendering
          setTransactionQueue(prev => [...prev, ...result.data.transactions]);
        }
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
    const mon = parseFloat(value) / 1e18;
    return mon < 0.01 ? `${mon.toExponential(2)} MON` : `${mon.toFixed(4)} MON`;
  };

  const getTransactionType = (tx) => {
    if (!tx.to) return 'Contract Creation';
    if (tx.input && tx.input !== '0x') return 'Contract Call';
    return 'Transfer';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Network className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Monad Visualizer</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Network Monitor</p>
                </div>
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600 dark:text-gray-300">Live</span>
                {lastUpdated && (
                  <span className="text-gray-400 dark:text-gray-500">
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>

              <Button variant="outline" size="sm">
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Network Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Transactions
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewTab
              metrics={metrics}
              recentBlocks={recentBlocks}
              formatHash={formatHash}
            />
          </TabsContent>

          {/* Live Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <LiveTransactionsTab
              displayTransactions={displayTransactions}
              transactionQueue={transactionQueue}
              renderingStats={renderingStats}
              loading={loading}
              error={error}
              formatHash={formatHash}
              formatAddress={formatAddress}
              formatValue={formatValue}
              getTransactionType={getTransactionType}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;

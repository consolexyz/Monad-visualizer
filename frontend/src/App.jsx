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
  Fuel,
  Sparkles
} from 'lucide-react';

// Import tab components
import OverviewTab from '@/components/tabs/OverviewTab';
import LiveTransactionsTab from '@/components/tabs/LiveTransactionsTab';
import VisualizerTab from '@/components/tabs/VisualizerTab';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

  const getTransactionTypeBadgeClass = (txType) => {
    const colorMap = {
      'Transfer': 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200',
      'Swap': 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900 dark:text-pink-200',
      'Mint': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200',
      'Burn': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200',
      'Stake': 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900 dark:text-lime-200',
      'Other': 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900 dark:text-gray-200'
    };

    return colorMap[txType] || 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900 dark:text-gray-200';
  };

  const getTransactionType = (tx) => {
    // Simple Transfer (no input data or direct transfer)
    if (!tx.input || tx.input === '0x') return 'Transfer';

    // Analyze function signatures for common operations
    const inputData = tx.input.toLowerCase();

    // Mint Operations
    if (inputData.startsWith('0x40c10f19') || // mint(address,uint256)
      inputData.startsWith('0xa0712d68') || // mint(uint256)
      inputData.startsWith('0x1249c58b') || // mint cToken
      inputData.includes('mint')) {
      return 'Mint';
    }

    // Burn Operations
    if (inputData.startsWith('0x42966c68') || // burn(uint256)
      inputData.startsWith('0x9dc29fac') || // burn(address,uint256)
      inputData.includes('burn')) {
      return 'Burn';
    }

    // Swap Operations (DEX related)
    if (inputData.startsWith('0x7ff36ab5') || // swapExactTokensForTokens
      inputData.startsWith('0x38ed1739') || // swapExactTokensForTokens
      inputData.startsWith('0x8803dbee') || // swapTokensForExactTokens
      inputData.startsWith('0xfb3bdb41') || // swapETHForExactTokens
      inputData.startsWith('0x5c11d795') || // swapExactETHForTokens
      inputData.includes('swap')) {
      return 'Swap';
    }

    // Staking Operations
    if (inputData.startsWith('0xa694fc3a') || // stake
      inputData.startsWith('0x2e1a7d4d') || // withdraw/unstake
      inputData.startsWith('0x3d18b912') || // getReward
      inputData.includes('stake') ||
      inputData.includes('unstake') ||
      inputData.includes('delegate')) {
      return 'Stake';
    }

    // Token transfers (ERC-20)
    if (inputData.startsWith('0xa9059cbb') || // transfer
      inputData.startsWith('0x23b872dd') || // transferFrom
      inputData.startsWith('0x095ea7b3')) { // approve
      return 'Transfer';
    }

    // Everything else is Other
    return 'Other';
  };

  return (
    <div className="min-h-screen dark bg-[#161616]">
      {/* Top Navigation */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-transparent rounded-lg">
                  <img
                    src="/monad.svg"
                    alt="Monad Logo"
                    className="h-8 w-8"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-card-foreground">Monad Visualizer</h1>
                </div>
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-muted-foreground">Live</span>
                {lastUpdated && (
                  <span className="text-muted-foreground">
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Network Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Transactions
            </TabsTrigger>
            <TabsTrigger value="visualizer" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Visualizer
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
              getTransactionTypeBadgeClass={getTransactionTypeBadgeClass}
            />
          </TabsContent>

          {/* Visualizer Tab */}
          <TabsContent value="visualizer" className="space-y-6">
            <VisualizerTab
              displayTransactions={displayTransactions}
              transactions={displayTransactions}
              metrics={metrics}
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

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

                {/* Metrics Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Block Height
                            </CardTitle>
                            <Database className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {metrics.block_height?.toLocaleString() || '0'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Current block number
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Transactions/Sec
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {metrics.tps?.toFixed(2) || '0.00'}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                                <span>10s: {metrics.tps_10s?.toFixed(1)}</span>
                                <span>30s: {metrics.tps_30s?.toFixed(1)}</span>
                                <span>60s: {metrics.tps_60s?.toFixed(1)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Active Validators
                            </CardTitle>
                            <Users className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {metrics.validators || '0'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Network validators
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-orange-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Block Time
                            </CardTitle>
                            <Clock className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {metrics.avg_block_time?.toFixed(1) || '0.0'}s
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge
                                    variant={getActivityBadgeVariant(metrics.network_activity)}
                                    className={getActivityColor(metrics.network_activity)}
                                >
                                    <Zap className="h-3 w-3 mr-1" />
                                    {metrics.network_activity} Activity
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Address Search */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5" />
                            Address Search
                        </CardTitle>
                        <CardDescription>
                            Search for transactions by wallet address to track specific account activity
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex space-x-2">
                            <Input
                                placeholder="Enter wallet address (0x...)"
                                value={searchAddress}
                                onChange={(e) => setSearchAddress(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                onClick={searchByAddress}
                                disabled={!searchAddress.trim()}
                                className="px-6"
                            >
                                <Search className="h-4 w-4 mr-2" />
                                Search
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Live Transactions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-green-500" />
                                Live Transactions
                                <Badge variant="secondary" className="ml-auto">
                                    {transactions.length}
                                </Badge>
                            </CardTitle>
                            <CardDescription>
                                Real-time transaction feed from the Monad network
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="h-6 w-6 animate-spin text-primary mr-3" />
                                    <span className="text-muted-foreground">Loading transactions...</span>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {transactions.slice(0, 10).map((tx, index) => (
                                        <div
                                            key={tx.hash}
                                            className="group relative bg-card border rounded-lg p-4 hover:shadow-md transition-all duration-200"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="font-mono text-sm text-primary hover:text-primary/80 cursor-pointer">
                                                    {formatHash(tx.hash)}
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    Block {tx.blockNumber}
                                                </Badge>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">From:</span>
                                                    <span className="font-mono text-xs">{formatAddress(tx.from)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">To:</span>
                                                    <span className="font-mono text-xs">{formatAddress(tx.to)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground">Value:</span>
                                                    <Badge variant="secondary" className="font-mono">
                                                        {formatValue(tx.value)}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {index === 0 && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Blocks */}
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
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {recentBlocks.map((block, index) => (
                                    <div
                                        key={block.number}
                                        className="group relative bg-card border rounded-lg p-4 hover:shadow-md transition-all duration-200"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="font-semibold text-foreground">
                                                Block #{block.number}
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                {block.transaction_count} txs
                                            </Badge>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Hash:</span>
                                                <span className="font-mono text-xs">{formatHash(block.hash)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Time:</span>
                                                <span className="text-xs">
                                                    {new Date(block.timestamp * 1000).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>
                                        {index === 0 && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Address Search Results */}
                {addressTransactions.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="h-5 w-5" />
                                Address Transactions
                                <Badge variant="secondary" className="ml-auto">
                                    {addressTransactions.length} results
                                </Badge>
                            </CardTitle>
                            <CardDescription>
                                Transactions for address: <span className="font-mono">{formatAddress(searchAddress)}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {addressTransactions.map((tx) => (
                                    <div
                                        key={tx.hash}
                                        className="bg-card border rounded-lg p-4 hover:shadow-md transition-all duration-200"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="font-mono text-sm text-primary">
                                                {formatHash(tx.hash)}
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                Block {tx.blockNumber}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">From:</span>
                                                <span className="font-mono text-xs">{formatAddress(tx.from)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">To:</span>
                                                <span className="font-mono text-xs">{formatAddress(tx.to)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Value:</span>
                                                <Badge variant="secondary" className="font-mono">
                                                    {formatValue(tx.value)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Error Display */}
                {error && (
                    <Card className="border-destructive">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-3">
                                <div className="text-destructive font-medium">
                                    ⚠️ Connection Error
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {error}
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.reload()}
                                    className="mt-4"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Retry Connection
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default App;

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Clock,
    Zap,
    Database,
    Network,
    Gauge,
    Shield,
    Blocks,
} from 'lucide-react';

export default function OverviewTab({ metrics, recentBlocks, formatHash }) {
    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <Card className=" rounded-lg p-8 text-white">
                <div className="max-w-2xl">
                    <h1 className="text-3xl font-bold mb-4">Monad Network Overview</h1>
                    <p className="text-lg opacity-90 mb-6">
                        Real-time insights into the Monad blockchain network performance, transactions, and activity.
                    </p>
                </div>
            </Card>

            {/* Network Metrics */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Network Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-2">
                            <CardTitle className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                Block Height
                            </CardTitle>
                            <Blocks className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                {metrics.block_height?.toLocaleString() || '0'}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Current block number
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-3">
                            <CardTitle className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                Transactions/Sec
                            </CardTitle>
                            <Gauge className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                {metrics.tps?.toFixed(2) || '0.00'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-3">
                            <CardTitle className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                Active Validators
                            </CardTitle>
                            <Shield className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                {metrics.validators || '0'}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Network validators
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-3">
                            <CardTitle className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                Block Time
                            </CardTitle>
                            <Clock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                {metrics.avg_block_time?.toFixed(1) || '0.0'}s
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge
                                    variant={metrics.network_activity === 'High' ? 'default' : metrics.network_activity === 'Medium' ? 'secondary' : 'outline'}
                                    className={`text-xs ${metrics.network_activity === 'High' ? 'text-green-600' : metrics.network_activity === 'Medium' ? 'text-yellow-600' : 'text-gray-600'}`}
                                >
                                    <Zap className="h-2 w-2 mr-1 text-gray-500 dark:text-gray-400" />
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

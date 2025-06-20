import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw } from 'lucide-react';

export default function LiveTransactionsTab({
    displayTransactions,
    transactionQueue,
    renderingStats,
    loading,
    error,
    formatHash,
    formatAddress,
    formatValue,
    getTransactionType,
    getTransactionTypeBadgeClass
}) {
    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Live Transactions</h2>
                    {/* Transaction Type Legend */}
                    <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-100 border border-green-300 rounded-sm dark:bg-green-900"></div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Transfer</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-pink-100 border border-pink-300 rounded-sm dark:bg-pink-900"></div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Swap</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-100 border border-blue-300 rounded-sm dark:bg-blue-900"></div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Mint</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-red-100 border border-red-300 rounded-sm dark:bg-red-900"></div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Burn</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-lime-100 border border-lime-300 rounded-sm dark:bg-lime-900"></div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Stake</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-gray-100 border border-gray-300 rounded-sm dark:bg-gray-900"></div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Other</span>
                            </div>
                        </div>
                    </div>
                </div>
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
                                                    className={`text-xs ${getTransactionTypeBadgeClass(getTransactionType(tx))}`}
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

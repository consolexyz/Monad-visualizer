import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Network, Sparkles } from 'lucide-react';
import CanvasTransactionRain from '../CanvasTransactionRain';

export default function VisualizerTab({
    displayTransactions,
    transactions,
    metrics,
    formatHash,
    formatAddress,
    formatValue,
    getTransactionType
}) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Transaction Visualizer</h2>
            </div>

            {/* Transaction Rain Visualization - Full Width */}
            <Card className="w-full">
                <CardContent className="p-0">
                    <div className="h-[calc(100vh-200px)] bg-gray-900 rounded-lg overflow-hidden">
                        <CanvasTransactionRain
                            transactions={transactions}
                            isActive={true}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

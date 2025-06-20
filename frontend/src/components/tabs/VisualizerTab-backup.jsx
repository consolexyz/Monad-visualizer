import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Network, Sparkles } from 'lucide-react';
import TransactionRain from '../TransactionRain';
import { Component } from 'react';

// Simple Error Boundary Component
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('TransactionRain Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white rounded-lg">
                    <div className="text-center">
                        <div className="text-red-500 text-4xl mb-4">⚠️</div>
                        <h3 className="text-lg font-semibold mb-2">Visualization Error</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            There was an issue loading the 3D visualization
                        </p>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

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
                <p className="text-gray-600 dark:text-gray-400">
                    Interactive visualization of blockchain transactions and network activity
                </p>
            </div>

            {/* Transaction Rain Visualization */}
            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            Transaction Rain
                        </CardTitle>
                        <CardDescription>
                            Real-time 3D visualization of live transactions falling like rain
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-96 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                            <ErrorBoundary>
                                <TransactionRain
                                    transactions={transactions}
                                    isActive={true}
                                />
                            </ErrorBoundary>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Additional visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Network className="h-5 w-5 text-blue-500" />
                            Network Graph
                        </CardTitle>
                        <CardDescription>
                            Address relationships and transaction patterns
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                                <Network className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">
                                    Network graph visualization will be implemented here
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                    Interactive node-link diagrams
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-green-500" />
                            Real-time Analytics
                        </CardTitle>
                        <CardDescription>
                            Live charts and performance metrics
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                                <BarChart3 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">
                                    Real-time TPS charts and analytics will be implemented here
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                    Interactive performance dashboards
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Future visualization concepts */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Future Visualizations
                    </CardTitle>
                    <CardDescription>
                        Upcoming visualization concepts and features
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-gray-600 dark:text-gray-400">
                                <div>
                                    <h4 className="font-medium mb-3 text-purple-500">3D Visualizations:</h4>
                                    <ul className="space-y-2 text-left">
                                        <li>• 3D Transaction Galaxy</li>
                                        <li>• Particle Lightning Network</li>
                                        <li>• Blockchain Storm Effects</li>
                                        <li>• Cyberpunk City View</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-3 text-blue-500">Interactive Features:</h4>
                                    <ul className="space-y-2 text-left">
                                        <li>• Real-time TPS graphs</li>
                                        <li>• Transaction heatmaps</li>
                                        <li>• Audio visualization</li>
                                        <li>• Network topology maps</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';

const DataSources: React.FC = () => {
  const {
    dataSources,
    recentCollections,
    isLoadingDataSources,
    isLoadingRecentCollections,
    dataSourcesError,
    recentCollectionsError,
    fetchDataSources,
    fetchRecentCollections
  } = useData();

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDataSources();
    if (selectedSource) {
      await fetchRecentCollections(selectedSource);
    }
    setRefreshing(false);
  };

  const handleSourceSelect = async (sourceName: string) => {
    setSelectedSource(sourceName);
    await fetchRecentCollections(sourceName);
  };

  const getSourceStatus = (source: any) => {
    const successRate = source.success_count + source.failure_count > 0 
      ? (source.success_count / (source.success_count + source.failure_count) * 100)
      : 0;
    
    if (successRate >= 95) return 'success';
    if (successRate >= 85) return 'warning';
    return 'error';
  };

  const getLastActivityTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)} days ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m ago`;
    } else {
      return `${diffMinutes}m ago`;
    }
  };

  if (isLoadingDataSources) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner"></div>
        <span className="ml-2">Loading data sources...</span>
      </div>
    );
  }

  if (dataSourcesError) {
    return (
      <div className="card">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-danger mb-2">Error Loading Data Sources</h2>
          <p className="text-secondary mb-4">{dataSourcesError}</p>
          <button onClick={handleRefresh} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark">Data Sources</h1>
          <p className="text-secondary mt-1">
            Monitor and manage external data source connections
          </p>
        </div>
        <button 
          onClick={handleRefresh}
          className="btn btn-primary"
          disabled={refreshing}
        >
          {refreshing ? (
            <div className="loading-spinner"></div>
          ) : (
            '🔄 Refresh'
          )}
        </button>
      </div>

      {/* Data Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dataSources.map((source) => {
          const status = getSourceStatus(source);
          const successRate = source.success_count + source.failure_count > 0 
            ? (source.success_count / (source.success_count + source.failure_count) * 100).toFixed(1)
            : '0';

          return (
            <div 
              key={source.name}
              className={`card cursor-pointer transition-all hover:shadow-lg ${
                selectedSource === source.name ? 'ring-2 ring-primary-blue' : ''
              }`}
              onClick={() => handleSourceSelect(source.name)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-dark">
                  {source.name.toUpperCase()}
                </h3>
                <span className={`status-indicator status-${status}`}>
                  {status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-secondary">Success Rate</span>
                  <span className={`font-medium ${
                    parseFloat(successRate) >= 95 ? 'text-success' :
                    parseFloat(successRate) >= 85 ? 'text-warning' : 'text-danger'
                  }`}>
                    {successRate}%
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-secondary">Total Records</span>
                  <span className="font-medium">{source.total_records.toLocaleString()}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-secondary">Collections</span>
                  <span className="font-medium">
                    {source.success_count} / {source.success_count + source.failure_count}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-secondary">Last Success</span>
                  <span className="font-medium text-sm">
                    {getLastActivityTime(source.last_success)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-secondary">Last Attempt</span>
                  <span className="font-medium text-sm">
                    {getLastActivityTime(source.last_attempt)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      status === 'success' ? 'bg-accent-green' :
                      status === 'warning' ? 'bg-warning-orange' : 'bg-danger-red'
                    }`}
                    style={{ width: `${successRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-secondary mt-1">
                  {source.success_count} successful out of {source.success_count + source.failure_count} attempts
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Collections Details */}
      {selectedSource && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-dark">
              Recent Collections: {selectedSource.toUpperCase()}
            </h3>
            {isLoadingRecentCollections && (
              <div className="loading-spinner"></div>
            )}
          </div>

          {recentCollectionsError ? (
            <div className="text-center py-8">
              <p className="text-danger mb-4">Failed to load recent collections</p>
              <button 
                onClick={() => fetchRecentCollections(selectedSource)}
                className="btn btn-secondary"
              >
                Retry
              </button>
            </div>
          ) : recentCollections[selectedSource] && recentCollections[selectedSource].length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Timestamp</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Records</th>
                    <th className="text-left py-3 px-4">File</th>
                    <th className="text-left py-3 px-4">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCollections[selectedSource].map((collection, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">
                            {new Date(collection.timestamp).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-secondary">
                            {new Date(collection.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`status-indicator ${
                          collection.success ? 'status-success' : 'status-error'
                        }`}>
                          {collection.success ? '✅ Success' : '❌ Failed'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">
                          {collection.record_count.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {collection.file_key ? (
                          <span className="text-sm text-secondary font-mono">
                            {collection.file_key.split('/').pop()}
                          </span>
                        ) : (
                          <span className="text-secondary">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {collection.data_hash ? (
                          <span className="text-xs text-secondary font-mono">
                            {collection.data_hash.substring(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-secondary">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-secondary">
              No recent collections found for {selectedSource}
            </div>
          )}
        </div>
      )}

      {/* Data Source Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h4 className="font-semibold mb-3">🏢 LSEG (London Stock Exchange Group)</h4>
          <p className="text-sm text-secondary mb-2">
            Power market data including prices, demand, supply, and renewable generation across major US regions.
          </p>
          <div className="text-xs text-secondary">
            <p>• Regional power prices (PJM, CAISO, ERCOT, NYISO)</p>
            <p>• Supply and demand metrics</p>
            <p>• Renewable generation data</p>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold mb-3">🌤️ Weather Data</h4>
          <p className="text-sm text-secondary mb-2">
            Meteorological data affecting energy demand and renewable generation capacity.
          </p>
          <div className="text-xs text-secondary">
            <p>• Temperature and humidity</p>
            <p>• Wind speed and direction</p>
            <p>• Cloud cover and precipitation</p>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold mb-3">📈 Economic Indicators</h4>
          <p className="text-sm text-secondary mb-2">
            Macroeconomic factors influencing energy markets and commodity prices.
          </p>
          <div className="text-xs text-secondary">
            <p>• Oil and gas prices</p>
            <p>• Carbon credit pricing</p>
            <p>• Economic indices</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSources;
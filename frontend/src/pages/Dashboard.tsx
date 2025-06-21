import React, { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  status = 'info'
}) => {
  const getStatusClass = () => {
    switch (status) {
      case 'success': return 'status-success';
      case 'warning': return 'status-warning';
      case 'error': return 'status-error';
      default: return 'status-info';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
      default: return '';
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-secondary">{title}</h3>
        <span className={`status-indicator ${getStatusClass()}`}>
          {status}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-dark">{value}</p>
          {subtitle && <p className="text-sm text-secondary">{subtitle}</p>}
        </div>
        {trend && trendValue && (
          <div className="text-right">
            <p className="text-sm font-medium">
              {getTrendIcon()} {trendValue}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const {
    dashboardSummary,
    dataSources,
    isLoadingSummary,
    isLoadingDataSources,
    summaryError,
    dataSourcesError,
    refreshAllData
  } = useData();

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllData();
      setLastRefresh(new Date());
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshAllData]);

  // Manual refresh
  const handleRefresh = async () => {
    await refreshAllData();
    setLastRefresh(new Date());
  };

  // Generate chart data for data sources
  const generateDataSourceChart = () => {
    if (!dataSources || dataSources.length === 0) {
      return null;
    }

    const labels = dataSources.map(source => source.name.toUpperCase());
    const successCounts = dataSources.map(source => source.success_count);
    const failureCounts = dataSources.map(source => source.failure_count);

    return {
      labels,
      datasets: [
        {
          label: 'Successful Collections',
          data: successCounts,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1
        },
        {
          label: 'Failed Collections',
          data: failureCounts,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  // Generate success rate doughnut chart
  const generateSuccessRateChart = () => {
    if (!dashboardSummary) return null;

    const successRate = dashboardSummary.success_rate_percentage;
    const failureRate = 100 - successRate;

    return {
      labels: ['Success Rate', 'Failure Rate'],
      datasets: [
        {
          data: [successRate, failureRate],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(239, 68, 68, 1)'
          ],
          borderWidth: 2
        }
      ]
    };
  };

  // Generate records by source chart
  const generateRecordsChart = () => {
    if (!dataSources || dataSources.length === 0) {
      return null;
    }

    const labels = dataSources.map(source => source.name.toUpperCase());
    const totalRecords = dataSources.map(source => source.total_records);

    return {
      labels,
      datasets: [
        {
          label: 'Total Records',
          data: totalRecords,
          backgroundColor: [
            'rgba(30, 58, 138, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)'
          ],
          borderColor: [
            'rgba(30, 58, 138, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: false,
      },
    },
  };

  if (isLoadingSummary || isLoadingDataSources) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner"></div>
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (summaryError || dataSourcesError) {
    return (
      <div className="card">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-danger mb-2">Dashboard Error</h2>
          <p className="text-secondary mb-4">
            {summaryError || dataSourcesError}
          </p>
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
          <h1 className="text-3xl font-bold text-dark">Energy Market Dashboard</h1>
          <p className="text-secondary mt-1">
            Real-time monitoring of energy market data collection and analysis
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-secondary">Last updated</p>
            <p className="text-sm font-medium">
              {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button 
            onClick={handleRefresh}
            className="btn btn-primary"
            disabled={isLoadingSummary || isLoadingDataSources}
          >
            {isLoadingSummary || isLoadingDataSources ? (
              <div className="loading-spinner"></div>
            ) : (
              '🔄 Refresh'
            )}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Collections (24h)"
          value={dashboardSummary?.total_collections_24h || 0}
          subtitle="Total data collections"
          status="info"
        />
        <MetricCard
          title="Success Rate"
          value={`${dashboardSummary?.success_rate_percentage?.toFixed(1) || 0}%`}
          subtitle="Last 24 hours"
          status={
            (dashboardSummary?.success_rate_percentage || 0) >= 95 ? 'success' :
            (dashboardSummary?.success_rate_percentage || 0) >= 85 ? 'warning' : 'error'
          }
        />
        <MetricCard
          title="Total Records"
          value={dashboardSummary?.total_records_24h?.toLocaleString() || '0'}
          subtitle="Data points collected"
          status="success"
        />
        <MetricCard
          title="Active Sources"
          value={`${dashboardSummary?.active_data_sources || 0}/${dataSources?.length || 0}`}
          subtitle="Data sources online"
          status={
            (dashboardSummary?.active_data_sources || 0) === (dataSources?.length || 0) ? 'success' : 'warning'
          }
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Source Performance */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Data Source Performance</h3>
          <div style={{ height: '300px' }}>
            {generateDataSourceChart() ? (
              <Bar data={generateDataSourceChart()!} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-secondary">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Success Rate */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Overall Success Rate</h3>
          <div style={{ height: '300px' }}>
            {generateSuccessRateChart() ? (
              <Doughnut data={generateSuccessRateChart()!} options={doughnutOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-secondary">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Records by Source */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Total Records by Data Source</h3>
        <div style={{ height: '400px' }}>
          {generateRecordsChart() ? (
            <Bar data={generateRecordsChart()!} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-secondary">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Data Sources Status */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Data Sources Status</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Source</th>
                <th className="text-left py-2 px-4">Last Success</th>
                <th className="text-left py-2 px-4">Success Count</th>
                <th className="text-left py-2 px-4">Failure Count</th>
                <th className="text-left py-2 px-4">Total Records</th>
                <th className="text-left py-2 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {dataSources?.map((source) => {
                const lastSuccess = source.last_success 
                  ? new Date(source.last_success).toLocaleString()
                  : 'Never';
                
                const successRate = source.success_count + source.failure_count > 0 
                  ? (source.success_count / (source.success_count + source.failure_count) * 100).toFixed(1)
                  : '0';

                const status = parseFloat(successRate) >= 95 ? 'success' : 
                              parseFloat(successRate) >= 85 ? 'warning' : 'error';

                return (
                  <tr key={source.name} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{source.name.toUpperCase()}</td>
                    <td className="py-2 px-4 text-sm">{lastSuccess}</td>
                    <td className="py-2 px-4">{source.success_count}</td>
                    <td className="py-2 px-4">{source.failure_count}</td>
                    <td className="py-2 px-4">{source.total_records.toLocaleString()}</td>
                    <td className="py-2 px-4">
                      <span className={`status-indicator status-${status}`}>
                        {successRate}% success
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h4 className="font-semibold mb-2">Data Collection</h4>
          <p className="text-sm text-secondary">
            Automated daily collection at 06:00 UTC
          </p>
          <p className="text-sm text-secondary">
            Next collection: {new Date(new Date().setHours(6, 0, 0, 0) + 24 * 60 * 60 * 1000).toLocaleString()}
          </p>
        </div>
        
        <div className="card">
          <h4 className="font-semibold mb-2">Weekly Analysis</h4>
          <p className="text-sm text-secondary">
            AI-powered analysis every Sunday at 02:00 UTC
          </p>
          <p className="text-sm text-secondary">
            Next analysis: Every Sunday
          </p>
        </div>
        
        <div className="card">
          <h4 className="font-semibold mb-2">Data Retention</h4>
          <p className="text-sm text-secondary">
            Raw data: 7 years (S3 lifecycle)
          </p>
          <p className="text-sm text-secondary">
            Reports: Permanent retention
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import React, { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';

interface Report {
  id: string;
  title: string;
  type: 'weekly' | 'monthly' | 'custom';
  date: string;
  status: 'completed' | 'processing' | 'failed';
  size: string;
  downloadUrl?: string;
  insights?: string;
}

const Reports: React.FC = () => {
  const { s3Files, isLoadingS3Files, s3FilesError, fetchS3Files } = useData();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Mock reports data - in production, this would come from S3/API
  const [reports] = useState<Report[]>([
    {
      id: '1',
      title: 'Weekly Energy Market Analysis',
      type: 'weekly',
      date: '2024-01-15',
      status: 'completed',
      size: '2.1 MB',
      downloadUrl: '/reports/weekly_report_20240115.pdf',
      insights: 'Power prices showed increased volatility due to extreme weather conditions. Renewable generation capacity factors remained above seasonal averages.'
    },
    {
      id: '2',
      title: 'Weekly Energy Market Analysis',
      type: 'weekly',
      date: '2024-01-08',
      status: 'completed',
      size: '1.9 MB',
      downloadUrl: '/reports/weekly_report_20240108.pdf',
      insights: 'Strong correlation observed between natural gas prices and electricity spot prices across all regions. Wind generation exceeded forecasts by 15%.'
    },
    {
      id: '3',
      title: 'Monthly Market Trends',
      type: 'monthly',
      date: '2024-01-01',
      status: 'completed',
      size: '5.2 MB',
      downloadUrl: '/reports/monthly_report_202401.pdf',
      insights: 'December showed record renewable energy contribution at 34% of total generation. Carbon pricing trends indicate strengthening market dynamics.'
    },
    {
      id: '4',
      title: 'Weekly Energy Market Analysis',
      type: 'weekly',
      date: '2024-01-01',
      status: 'processing',
      size: 'Processing...',
      insights: 'Analysis in progress. Expected completion in 15 minutes.'
    }
  ]);

  useEffect(() => {
    fetchS3Files('reports/');
  }, [fetchS3Files]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchS3Files('reports/');
    setRefreshing(false);
  };

  const handleDownload = (report: Report) => {
    if (report.downloadUrl) {
      // In production, this would trigger a secure download from S3
      window.open(report.downloadUrl, '_blank');
    }
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'completed': return 'status-success';
      case 'processing': return 'status-warning';
      case 'failed': return 'status-error';
      default: return 'status-info';
    }
  };

  const getTypeIcon = (type: Report['type']) => {
    switch (type) {
      case 'weekly': return '📊';
      case 'monthly': return '📈';
      case 'custom': return '🔍';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-dark">Analysis Reports</h1>
          <p className="text-secondary mt-1">
            AI-powered energy market analysis reports and insights
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            className="btn btn-secondary"
            disabled={refreshing}
          >
            {refreshing ? (
              <div className="loading-spinner"></div>
            ) : (
              '🔄 Refresh'
            )}
          </button>
          <button className="btn btn-primary">
            📋 Generate Custom Report
          </button>
        </div>
      </div>

      {/* Report Generation Status */}
      <div className="card bg-gradient-to-r from-primary-blue to-secondary-blue text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">🤖 Next AI Analysis</h3>
            <p className="text-blue-100">
              Weekly analysis scheduled for Sunday at 2:00 AM UTC
            </p>
            <p className="text-blue-200 text-sm mt-1">
              Powered by Claude AI for comprehensive market insights
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {new Date().getDay() === 0 ? 'Today' : 
               7 - new Date().getDay() === 1 ? 'Tomorrow' : 
               `${7 - new Date().getDay()} days`}
            </p>
            <p className="text-blue-100 text-sm">until next analysis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">Available Reports</h3>
            
            {isLoadingS3Files ? (
              <div className="flex items-center justify-center py-8">
                <div className="loading-spinner mr-2"></div>
                Loading reports...
              </div>
            ) : s3FilesError ? (
              <div className="text-center py-8">
                <p className="text-danger mb-4">Failed to load reports</p>
                <button onClick={handleRefresh} className="btn btn-secondary">
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div 
                    key={report.id}
                    className={`border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer ${
                      selectedReport?.id === report.id ? 'border-primary-blue bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getTypeIcon(report.type)}</span>
                        <div>
                          <h4 className="font-semibold text-dark">{report.title}</h4>
                          <p className="text-sm text-secondary">
                            {new Date(report.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`status-indicator ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                        <p className="text-sm text-secondary mt-1">{report.size}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-secondary mb-3">
                      {report.insights}
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {report.type.toUpperCase()}
                      </span>
                      {report.status === 'completed' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(report);
                          }}
                          className="btn btn-primary text-sm"
                        >
                          📥 Download
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Report Details Panel */}
        <div className="space-y-6">
          {selectedReport ? (
            <>
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Report Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-secondary">Title</label>
                    <p className="font-medium">{selectedReport.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary">Type</label>
                    <p className="font-medium capitalize">{selectedReport.type} Analysis</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary">Date Generated</label>
                    <p className="font-medium">
                      {new Date(selectedReport.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary">Status</label>
                    <span className={`status-indicator ${getStatusColor(selectedReport.status)}`}>
                      {selectedReport.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary">File Size</label>
                    <p className="font-medium">{selectedReport.size}</p>
                  </div>
                  {selectedReport.status === 'completed' && (
                    <button 
                      onClick={() => handleDownload(selectedReport)}
                      className="w-full btn btn-primary mt-4"
                    >
                      📥 Download PDF Report
                    </button>
                  )}
                </div>
              </div>

              <div className="card">
                <h4 className="font-semibold mb-3">Key Insights</h4>
                <p className="text-sm text-secondary leading-relaxed">
                  {selectedReport.insights}
                </p>
              </div>
            </>
          ) : (
            <div className="card text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="font-semibold mb-2">Select a Report</h3>
              <p className="text-secondary text-sm">
                Choose a report from the list to view details and download options.
              </p>
            </div>
          )}

          {/* Report Types Info */}
          <div className="card">
            <h4 className="font-semibold mb-3">Report Types</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-lg">📊</span>
                <div>
                  <p className="font-medium text-sm">Weekly Analysis</p>
                  <p className="text-xs text-secondary">
                    Comprehensive market trends and AI insights
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">📈</span>
                <div>
                  <p className="font-medium text-sm">Monthly Trends</p>
                  <p className="text-xs text-secondary">
                    Long-term pattern analysis and forecasts
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">🔍</span>
                <div>
                  <p className="font-medium text-sm">Custom Reports</p>
                  <p className="text-xs text-secondary">
                    Tailored analysis for specific requirements
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* S3 Files Info */}
      {s3Files.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">File Storage Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">File Name</th>
                  <th className="text-left py-2 px-4">Size</th>
                  <th className="text-left py-2 px-4">Modified</th>
                  <th className="text-left py-2 px-4">Type</th>
                </tr>
              </thead>
              <tbody>
                {s3Files
                  .filter(file => file.key.includes('reports/'))
                  .map((file, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 font-mono text-sm">
                        {file.key.split('/').pop()}
                      </td>
                      <td className="py-2 px-4">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </td>
                      <td className="py-2 px-4 text-sm">
                        {new Date(file.last_modified).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-4">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {file.key.includes('.pdf') ? 'PDF' : 
                           file.key.includes('.json') ? 'JSON' : 'DATA'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
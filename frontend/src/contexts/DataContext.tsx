import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/apiService';

// Types
interface DataSource {
  name: string;
  last_success: string | null;
  last_attempt: string | null;
  success_count: number;
  failure_count: number;
  total_records: number;
}

interface DashboardSummary {
  total_collections_24h: number;
  successful_collections_24h: number;
  success_rate_percentage: number;
  total_records_24h: number;
  active_data_sources: number;
  data_sources: string[];
}

interface RecentCollection {
  timestamp: string;
  success: boolean;
  record_count: number;
  file_key: string | null;
  data_hash: string | null;
}

interface S3File {
  key: string;
  size: number;
  last_modified: string;
  data_source: string;
  record_count: string;
  collection_time: string;
}

interface DataContextType {
  // Data
  dataSources: DataSource[];
  dashboardSummary: DashboardSummary | null;
  recentCollections: { [source: string]: RecentCollection[] };
  s3Files: S3File[];
  
  // Loading states
  isLoadingDataSources: boolean;
  isLoadingSummary: boolean;
  isLoadingRecentCollections: boolean;
  isLoadingS3Files: boolean;
  
  // Errors
  dataSourcesError: string | null;
  summaryError: string | null;
  recentCollectionsError: string | null;
  s3FilesError: string | null;
  
  // Actions
  fetchDataSources: () => Promise<void>;
  fetchDashboardSummary: () => Promise<void>;
  fetchRecentCollections: (source: string, limit?: number) => Promise<void>;
  fetchS3Files: (prefix?: string, limit?: number) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

interface DataProviderProps {
  children: ReactNode;
}

// Create context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Hook to use data context
export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Data Provider Component
export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  // State
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [recentCollections, setRecentCollections] = useState<{ [source: string]: RecentCollection[] }>({});
  const [s3Files, setS3Files] = useState<S3File[]>([]);

  // Loading states
  const [isLoadingDataSources, setIsLoadingDataSources] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingRecentCollections, setIsLoadingRecentCollections] = useState(false);
  const [isLoadingS3Files, setIsLoadingS3Files] = useState(false);

  // Error states
  const [dataSourcesError, setDataSourcesError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [recentCollectionsError, setRecentCollectionsError] = useState<string | null>(null);
  const [s3FilesError, setS3FilesError] = useState<string | null>(null);

  // Fetch data sources
  const fetchDataSources = async (): Promise<void> => {
    try {
      setIsLoadingDataSources(true);
      setDataSourcesError(null);
      
      const response = await apiService.getDataSources();
      setDataSources(response.data_sources || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data sources';
      setDataSourcesError(errorMessage);
      console.error('Error fetching data sources:', error);
    } finally {
      setIsLoadingDataSources(false);
    }
  };

  // Fetch dashboard summary
  const fetchDashboardSummary = async (): Promise<void> => {
    try {
      setIsLoadingSummary(true);
      setSummaryError(null);
      
      const response = await apiService.getDashboardSummary();
      setDashboardSummary(response.summary || null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard summary';
      setSummaryError(errorMessage);
      console.error('Error fetching dashboard summary:', error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Fetch recent collections for a specific source
  const fetchRecentCollections = async (source: string, limit: number = 50): Promise<void> => {
    try {
      setIsLoadingRecentCollections(true);
      setRecentCollectionsError(null);
      
      const response = await apiService.getRecentData(source, limit);
      setRecentCollections(prev => ({
        ...prev,
        [source]: response.recent_collections || []
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to fetch recent collections for ${source}`;
      setRecentCollectionsError(errorMessage);
      console.error(`Error fetching recent collections for ${source}:`, error);
    } finally {
      setIsLoadingRecentCollections(false);
    }
  };

  // Fetch S3 files
  const fetchS3Files = async (prefix: string = '', limit: number = 20): Promise<void> => {
    try {
      setIsLoadingS3Files(true);
      setS3FilesError(null);
      
      const response = await apiService.getS3Files(prefix, limit);
      setS3Files(response.files || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch S3 files';
      setS3FilesError(errorMessage);
      console.error('Error fetching S3 files:', error);
    } finally {
      setIsLoadingS3Files(false);
    }
  };

  // Refresh all data
  const refreshAllData = async (): Promise<void> => {
    await Promise.allSettled([
      fetchDataSources(),
      fetchDashboardSummary(),
      fetchS3Files()
    ]);
  };

  // Auto-refresh data on mount and periodically
  useEffect(() => {
    // Initial data fetch
    refreshAllData();

    // Set up periodic refresh (every 5 minutes)
    const interval = setInterval(() => {
      refreshAllData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const value: DataContextType = {
    // Data
    dataSources,
    dashboardSummary,
    recentCollections,
    s3Files,
    
    // Loading states
    isLoadingDataSources,
    isLoadingSummary,
    isLoadingRecentCollections,
    isLoadingS3Files,
    
    // Errors
    dataSourcesError,
    summaryError,
    recentCollectionsError,
    s3FilesError,
    
    // Actions
    fetchDataSources,
    fetchDashboardSummary,
    fetchRecentCollections,
    fetchS3Files,
    refreshAllData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataContext;
import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API Response Types
interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

interface DataSourcesResponse extends ApiResponse {
  data_sources: Array<{
    name: string;
    last_success: string | null;
    last_attempt: string | null;
    success_count: number;
    failure_count: number;
    total_records: number;
  }>;
  total_sources: number;
}

interface DashboardSummaryResponse extends ApiResponse {
  summary: {
    total_collections_24h: number;
    successful_collections_24h: number;
    success_rate_percentage: number;
    total_records_24h: number;
    active_data_sources: number;
    data_sources: string[];
  };
  period: string;
}

interface RecentDataResponse extends ApiResponse {
  data_source: string;
  recent_collections: Array<{
    timestamp: string;
    success: boolean;
    record_count: number;
    file_key: string | null;
    data_hash: string | null;
  }>;
  count: number;
}

interface S3FilesResponse extends ApiResponse {
  files: Array<{
    key: string;
    size: number;
    last_modified: string;
    data_source: string;
    record_count: string;
    collection_time: string;
  }>;
  count: number;
  bucket: string;
  prefix: string;
}

interface HealthCheckResponse extends ApiResponse {
  status: string;
  services: {
    dynamodb: string;
    s3: string;
  };
  environment: string;
  version: string;
}

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Determine API base URL based on environment
    this.baseURL = this.getApiBaseUrl();
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication headers if available
        const token = localStorage.getItem('nexus_ena_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        
        // Handle specific error cases
        if (error.response?.status === 401) {
          // Unauthorized - redirect to login
          localStorage.removeItem('nexus_ena_token');
          window.location.href = '/login';
        }
        
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private getApiBaseUrl(): string {
    // In development, use environment variable or default
    if (process.env.NODE_ENV === 'development') {
      return process.env.REACT_APP_API_URL || 'http://localhost:3001';
    }
    
    // In production, use the API Gateway URL
    // This should be replaced with your actual API Gateway URL
    return process.env.REACT_APP_API_URL || '/api';
  }

  private handleApiError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || 
                     error.response.data?.message || 
                     `API Error: ${error.response.status}`;
      return new Error(message);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network error: Unable to reach the server');
    } else {
      // Something else happened
      return new Error(error.message || 'Unknown API error');
    }
  }

  // Health check endpoint
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await this.client.get<HealthCheckResponse>('/health');
    return response.data;
  }

  // Get data sources status
  async getDataSources(): Promise<DataSourcesResponse> {
    const response = await this.client.get<DataSourcesResponse>('/api/data-sources');
    return response.data;
  }

  // Get dashboard summary
  async getDashboardSummary(): Promise<DashboardSummaryResponse> {
    const response = await this.client.get<DashboardSummaryResponse>('/api/dashboard/summary');
    return response.data;
  }

  // Get recent data for a specific source
  async getRecentData(source: string, limit: number = 50): Promise<RecentDataResponse> {
    const response = await this.client.get<RecentDataResponse>(
      `/api/data-sources/${encodeURIComponent(source)}/recent`,
      { params: { limit } }
    );
    return response.data;
  }

  // Get S3 files
  async getS3Files(prefix: string = '', limit: number = 20): Promise<S3FilesResponse> {
    const response = await this.client.get<S3FilesResponse>('/api/files', {
      params: { prefix, limit }
    });
    return response.data;
  }

  // Download file from S3 (returns blob URL)
  async downloadFile(fileKey: string): Promise<string> {
    const response = await this.client.get(`/api/files/${encodeURIComponent(fileKey)}/download`, {
      responseType: 'blob'
    });
    
    // Create blob URL for download
    const blob = new Blob([response.data]);
    return URL.createObjectURL(blob);
  }

  // Mock data methods for development
  private mockDataSources(): DataSourcesResponse {
    return {
      data_sources: [
        {
          name: 'lseg',
          last_success: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          last_attempt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          success_count: 25,
          failure_count: 2,
          total_records: 1250
        },
        {
          name: 'weather',
          last_success: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          last_attempt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          success_count: 30,
          failure_count: 0,
          total_records: 840
        },
        {
          name: 'economic',
          last_success: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          last_attempt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          success_count: 22,
          failure_count: 3,
          total_records: 660
        }
      ],
      total_sources: 3,
      timestamp: new Date().toISOString()
    };
  }

  private mockDashboardSummary(): DashboardSummaryResponse {
    return {
      summary: {
        total_collections_24h: 15,
        successful_collections_24h: 14,
        success_rate_percentage: 93.33,
        total_records_24h: 2750,
        active_data_sources: 3,
        data_sources: ['lseg', 'weather', 'economic']
      },
      period: '24 hours',
      timestamp: new Date().toISOString()
    };
  }

  private mockRecentData(source: string): RecentDataResponse {
    const collections = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      success: Math.random() > 0.1, // 90% success rate
      record_count: Math.floor(Math.random() * 100) + 50,
      file_key: `raw-data/2024/01/15/${source}_20240115_${String(6 + i).padStart(2, '0')}0000.parquet`,
      data_hash: Math.random().toString(36).substring(7)
    }));

    return {
      data_source: source,
      recent_collections: collections,
      count: collections.length,
      timestamp: new Date().toISOString()
    };
  }

  private mockS3Files(): S3FilesResponse {
    const files = [
      {
        key: 'raw-data/2024/01/15/lseg_20240115_060000.parquet',
        size: 1024 * 500, // 500KB
        last_modified: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        data_source: 'lseg',
        record_count: '150',
        collection_time: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      },
      {
        key: 'raw-data/2024/01/15/weather_20240115_060000.parquet',
        size: 1024 * 250, // 250KB
        last_modified: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
        data_source: 'weather',
        record_count: '84',
        collection_time: new Date(Date.now() - 50 * 60 * 1000).toISOString()
      },
      {
        key: 'reports/pdf/weekly_report_20240115.pdf',
        size: 1024 * 1024 * 2, // 2MB
        last_modified: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        data_source: 'weekly_analysis',
        record_count: 'N/A',
        collection_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    return {
      files,
      count: files.length,
      bucket: 'nexus-ena-data-lake-prod',
      prefix: '',
      timestamp: new Date().toISOString()
    };
  }

  // Development mode: return mock data
  private async getMockData<T>(endpoint: string, mockFunction: () => T): Promise<T> {
    if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_API_URL) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      // Simulate occasional errors (5% chance)
      if (Math.random() < 0.05) {
        throw new Error(`Mock error for ${endpoint}`);
      }
      
      return mockFunction();
    }
    
    // Fallback to actual API call
    throw new Error('API service not configured for production');
  }

  // Override methods to use mock data in development
  async getDataSourcesMock(): Promise<DataSourcesResponse> {
    return this.getMockData('/api/data-sources', () => this.mockDataSources());
  }

  async getDashboardSummaryMock(): Promise<DashboardSummaryResponse> {
    return this.getMockData('/api/dashboard/summary', () => this.mockDashboardSummary());
  }

  async getRecentDataMock(source: string): Promise<RecentDataResponse> {
    return this.getMockData(`/api/data-sources/${source}/recent`, () => this.mockRecentData(source));
  }

  async getS3FilesMock(): Promise<S3FilesResponse> {
    return this.getMockData('/api/files', () => this.mockS3Files());
  }
}

// Create and export singleton instance
export const apiService = new ApiService();

// Export types for use in components
export type {
  DataSourcesResponse,
  DashboardSummaryResponse,
  RecentDataResponse,
  S3FilesResponse,
  HealthCheckResponse
};
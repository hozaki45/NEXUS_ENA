"""
NEXUS_ENA Data Collector Lambda Function
Collects energy market data from external APIs and stores in S3/DynamoDB
"""

import json
import boto3
import logging
import os
import pandas as pd
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import pyarrow.parquet as pq
import pyarrow as pa
from io import StringIO, BytesIO
import hashlib

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
ssm_client = boto3.client('ssm')

# Environment variables
S3_BUCKET = os.environ['S3_BUCKET']
DYNAMODB_TABLE = os.environ['DYNAMODB_TABLE'] 
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'prod')

# Configuration
DATA_SOURCES = {
    'lseg': {
        'name': 'LSEG Power Markets',
        'enabled': True,
        'rate_limit': 100,
        'timeout': 30
    },
    'weather': {
        'name': 'Weather Data',
        'enabled': True,
        'rate_limit': 1000,
        'timeout': 10
    },
    'economic': {
        'name': 'Economic Indicators',
        'enabled': True,
        'rate_limit': 100,
        'timeout': 30
    }
}

class DataCollectionError(Exception):
    """Custom exception for data collection errors"""
    pass

class DataCollector:
    """Main data collection class"""
    
    def __init__(self):
        self.table = dynamodb.Table(DYNAMODB_TABLE)
        self.api_keys = {}
        self.load_api_keys()
    
    def load_api_keys(self):
        """Load API keys from Systems Manager Parameter Store"""
        try:
            # Get Claude API key
            response = ssm_client.get_parameter(
                Name=f'/nexus-ena/claude-api-key',
                WithDecryption=True
            )
            self.api_keys['claude'] = response['Parameter']['Value']
            
            # Get LSEG API key
            response = ssm_client.get_parameter(
                Name=f'/nexus-ena/lseg-api-key',
                WithDecryption=True
            )
            self.api_keys['lseg'] = response['Parameter']['Value']
            
            # Get Weather API key (optional)
            try:
                response = ssm_client.get_parameter(
                    Name=f'/nexus-ena/weather-api-key',
                    WithDecryption=True
                )
                self.api_keys['weather'] = response['Parameter']['Value']
            except ssm_client.exceptions.ParameterNotFound:
                logger.warning("Weather API key not found, skipping weather data collection")
            
            # Get Economic API key (optional)
            try:
                response = ssm_client.get_parameter(
                    Name=f'/nexus-ena/economic-api-key',
                    WithDecryption=True
                )
                self.api_keys['economic'] = response['Parameter']['Value']
            except ssm_client.exceptions.ParameterNotFound:
                logger.warning("Economic API key not found, skipping economic data collection")
                
        except Exception as e:
            logger.error(f"Failed to load API keys: {str(e)}")
            raise DataCollectionError(f"API key loading failed: {str(e)}")
    
    def collect_lseg_data(self) -> Optional[pd.DataFrame]:
        """Collect power market data from LSEG API"""
        if 'lseg' not in self.api_keys:
            logger.warning("LSEG API key not available")
            return None
            
        try:
            # Mock LSEG API call - replace with actual API endpoint
            headers = {
                'Authorization': f'Bearer {self.api_keys["lseg"]}',
                'Content-Type': 'application/json'
            }
            
            # Example power market data structure
            # In production, replace with actual LSEG API endpoints
            mock_data = {
                'timestamp': datetime.utcnow().isoformat(),
                'power_prices': [
                    {'region': 'PJM', 'price': 45.50, 'demand': 85000, 'supply': 90000},
                    {'region': 'CAISO', 'price': 52.30, 'demand': 42000, 'supply': 45000},
                    {'region': 'ERCOT', 'price': 38.75, 'demand': 68000, 'supply': 72000},
                    {'region': 'NYISO', 'price': 48.90, 'demand': 25000, 'supply': 27000}
                ],
                'renewable_generation': [
                    {'source': 'wind', 'capacity': 15000, 'generation': 12500},
                    {'source': 'solar', 'capacity': 8000, 'generation': 6800},
                    {'source': 'hydro', 'capacity': 5000, 'generation': 4500}
                ]
            }
            
            # Convert to DataFrame
            power_df = pd.DataFrame(mock_data['power_prices'])
            renewable_df = pd.DataFrame(mock_data['renewable_generation'])
            
            # Add timestamp to all records
            power_df['timestamp'] = mock_data['timestamp']
            renewable_df['timestamp'] = mock_data['timestamp']
            
            # Combine datasets
            combined_df = pd.concat([
                power_df.assign(data_type='power_prices'),
                renewable_df.assign(data_type='renewable_generation')
            ], ignore_index=True)
            
            logger.info(f"Collected {len(combined_df)} LSEG data points")
            return combined_df
            
        except Exception as e:
            logger.error(f"LSEG data collection failed: {str(e)}")
            return None
    
    def collect_weather_data(self) -> Optional[pd.DataFrame]:
        """Collect weather data affecting energy markets"""
        if 'weather' not in self.api_keys:
            logger.warning("Weather API key not available")
            return None
            
        try:
            # Mock weather API call - replace with actual API (OpenWeatherMap, etc.)
            # Key regions for energy market impact
            regions = ['New York', 'California', 'Texas', 'Pennsylvania']
            weather_data = []
            
            for region in regions:
                # Mock weather data - replace with actual API calls
                weather_point = {
                    'region': region,
                    'temperature': 72.5 + (hash(region) % 20) - 10,  # Mock temp
                    'humidity': 65 + (hash(region) % 30),
                    'wind_speed': 8.5 + (hash(region) % 15),
                    'cloud_cover': 40 + (hash(region) % 60),
                    'timestamp': datetime.utcnow().isoformat()
                }
                weather_data.append(weather_point)
            
            weather_df = pd.DataFrame(weather_data)
            logger.info(f"Collected {len(weather_df)} weather data points")
            return weather_df
            
        except Exception as e:
            logger.error(f"Weather data collection failed: {str(e)}")
            return None
    
    def collect_economic_data(self) -> Optional[pd.DataFrame]:
        """Collect economic indicators affecting energy markets"""
        if 'economic' not in self.api_keys:
            logger.warning("Economic API key not available")
            return None
            
        try:
            # Mock economic indicators - replace with actual API (FRED, Alpha Vantage)
            economic_data = {
                'timestamp': datetime.utcnow().isoformat(),
                'indicators': [
                    {'indicator': 'crude_oil_wti', 'value': 82.45, 'unit': 'USD/barrel'},
                    {'indicator': 'natural_gas_henry_hub', 'value': 3.85, 'unit': 'USD/MMBtu'},
                    {'indicator': 'coal_price', 'value': 165.30, 'unit': 'USD/ton'},
                    {'indicator': 'carbon_credits', 'value': 28.75, 'unit': 'USD/ton_CO2'},
                    {'indicator': 'usd_index', 'value': 102.8, 'unit': 'index'},
                    {'indicator': 'inflation_rate', 'value': 3.2, 'unit': 'percent'}
                ]
            }
            
            econ_df = pd.DataFrame(economic_data['indicators'])
            econ_df['timestamp'] = economic_data['timestamp']
            
            logger.info(f"Collected {len(econ_df)} economic indicators")
            return econ_df
            
        except Exception as e:
            logger.error(f"Economic data collection failed: {str(e)}")
            return None
    
    def save_to_s3(self, df: pd.DataFrame, data_source: str) -> str:
        """Save DataFrame to S3 in Parquet format"""
        try:
            # Generate file path with partitioning
            now = datetime.utcnow()
            year = now.strftime('%Y')
            month = now.strftime('%m')
            day = now.strftime('%d')
            hour = now.strftime('%H')
            
            # Create file path
            file_key = f"raw-data/year={year}/month={month}/day={day}/{data_source}_{now.strftime('%Y%m%d_%H%M%S')}.parquet"
            
            # Convert DataFrame to Parquet bytes
            table = pa.Table.from_pandas(df)
            parquet_buffer = BytesIO()
            pq.write_table(table, parquet_buffer)
            parquet_bytes = parquet_buffer.getvalue()
            
            # Upload to S3
            s3_client.put_object(
                Bucket=S3_BUCKET,
                Key=file_key,
                Body=parquet_bytes,
                ContentType='application/octet-stream',
                ServerSideEncryption='AES256',
                Metadata={
                    'data_source': data_source,
                    'record_count': str(len(df)),
                    'collection_time': now.isoformat(),
                    'environment': ENVIRONMENT
                }
            )
            
            logger.info(f"Saved {len(df)} records to s3://{S3_BUCKET}/{file_key}")
            return file_key
            
        except Exception as e:
            logger.error(f"S3 save failed for {data_source}: {str(e)}")
            raise DataCollectionError(f"S3 save failed: {str(e)}")
    
    def update_metadata(self, data_source: str, file_key: str, record_count: int, success: bool):
        """Update metadata in DynamoDB"""
        try:
            timestamp = datetime.utcnow().isoformat()
            
            # Calculate data hash for integrity check
            data_hash = hashlib.md5(f"{data_source}_{timestamp}_{record_count}".encode()).hexdigest()
            
            item = {
                'data_source': data_source,
                'timestamp': timestamp,
                'file_key': file_key,
                'record_count': record_count,
                'success': success,
                'environment': ENVIRONMENT,
                'data_hash': data_hash,
                'ttl': int((datetime.utcnow() + timedelta(days=90)).timestamp())  # Auto-cleanup
            }
            
            if not success:
                item['error_message'] = f"Collection failed for {data_source}"
            
            self.table.put_item(Item=item)
            logger.info(f"Updated metadata for {data_source}: {record_count} records")
            
        except Exception as e:
            logger.error(f"Metadata update failed for {data_source}: {str(e)}")
    
    def process_data_source(self, source_name: str) -> Dict[str, Any]:
        """Process a single data source"""
        result = {
            'source': source_name,
            'success': False,
            'record_count': 0,
            'file_key': None,
            'error': None
        }
        
        try:
            # Check if source is enabled
            if not DATA_SOURCES.get(source_name, {}).get('enabled', False):
                result['error'] = f"Data source {source_name} is disabled"
                return result
            
            # Collect data based on source
            df = None
            if source_name == 'lseg':
                df = self.collect_lseg_data()
            elif source_name == 'weather':
                df = self.collect_weather_data()
            elif source_name == 'economic':
                df = self.collect_economic_data()
            else:
                result['error'] = f"Unknown data source: {source_name}"
                return result
            
            if df is None or len(df) == 0:
                result['error'] = f"No data collected from {source_name}"
                return result
            
            # Save to S3
            file_key = self.save_to_s3(df, source_name)
            
            # Update metadata
            self.update_metadata(source_name, file_key, len(df), True)
            
            result.update({
                'success': True,
                'record_count': len(df),
                'file_key': file_key
            })
            
        except Exception as e:
            error_msg = str(e)
            result['error'] = error_msg
            logger.error(f"Failed to process {source_name}: {error_msg}")
            
            # Update metadata with failure
            self.update_metadata(source_name, None, 0, False)
        
        return result

def lambda_handler(event, context):
    """
    Main Lambda handler function
    
    Args:
        event: AWS Lambda event object
        context: AWS Lambda context object
    
    Returns:
        dict: Response with status and results
    """
    
    start_time = datetime.utcnow()
    logger.info(f"Starting data collection at {start_time.isoformat()}")
    
    try:
        # Initialize data collector
        collector = DataCollector()
        
        # Process each enabled data source
        results = []
        total_records = 0
        successful_sources = 0
        
        for source_name in DATA_SOURCES.keys():
            if DATA_SOURCES[source_name].get('enabled', False):
                logger.info(f"Processing data source: {source_name}")
                result = collector.process_data_source(source_name)
                results.append(result)
                
                if result['success']:
                    successful_sources += 1
                    total_records += result['record_count']
                else:
                    logger.error(f"Failed to process {source_name}: {result['error']}")
        
        # Calculate execution time
        end_time = datetime.utcnow()
        execution_time = (end_time - start_time).total_seconds()
        
        # Prepare response
        response = {
            'statusCode': 200 if successful_sources > 0 else 500,
            'body': json.dumps({
                'message': 'Data collection completed',
                'timestamp': end_time.isoformat(),
                'execution_time_seconds': execution_time,
                'total_sources_processed': len([r for r in results if r['success'] or not r['success']]),
                'successful_sources': successful_sources,
                'total_records_collected': total_records,
                'results': results,
                's3_bucket': S3_BUCKET,
                'environment': ENVIRONMENT
            }, default=str)
        }
        
        logger.info(f"Collection completed: {successful_sources} sources, {total_records} records, {execution_time:.2f}s")
        return response
        
    except Exception as e:
        error_msg = f"Lambda execution failed: {str(e)}"
        logger.error(error_msg)
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': error_msg,
                'timestamp': datetime.utcnow().isoformat(),
                'environment': ENVIRONMENT
            })
        }

# For local testing
if __name__ == "__main__":
    # Test event
    test_event = {}
    test_context = type('Context', (), {
        'function_name': 'nexus-data-collector-test',
        'aws_request_id': 'test-request-id'
    })()
    
    result = lambda_handler(test_event, test_context)
    print(json.dumps(result, indent=2))
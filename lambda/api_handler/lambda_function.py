"""
NEXUS_ENA API Handler Lambda Function
Handles API Gateway requests for the NEXUS_ENA dashboard
"""

import json
import boto3
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import base64
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Environment variables
S3_BUCKET = os.environ['S3_BUCKET']
DYNAMODB_TABLE = os.environ['DYNAMODB_TABLE']
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'prod')

class DecimalEncoder(json.JSONEncoder):
    """JSON encoder for DynamoDB Decimal types"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

class APIHandler:
    """Main API handler class"""
    
    def __init__(self):
        self.table = dynamodb.Table(DYNAMODB_TABLE)
    
    def get_cors_headers(self) -> Dict[str, str]:
        """Get CORS headers for API responses"""
        return {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
            'Access-Control-Max-Age': '86400'
        }
    
    def create_response(self, status_code: int, body: Any, headers: Optional[Dict] = None) -> Dict:
        """Create standardized API response"""
        response_headers = self.get_cors_headers()
        if headers:
            response_headers.update(headers)
        
        return {
            'statusCode': status_code,
            'headers': response_headers,
            'body': json.dumps(body, cls=DecimalEncoder, default=str)
        }
    
    def handle_options(self) -> Dict:
        """Handle CORS preflight OPTIONS requests"""
        return self.create_response(200, {'message': 'CORS preflight successful'})
    
    def get_data_sources_status(self) -> Dict:
        """Get status of all data sources"""
        try:
            # Query recent data collection status
            response = self.table.scan(
                FilterExpression='#ts > :timestamp',
                ExpressionAttributeNames={'#ts': 'timestamp'},
                ExpressionAttributeValues={
                    ':timestamp': (datetime.utcnow() - timedelta(days=7)).isoformat()
                },
                Limit=100
            )
            
            # Group by data source
            sources_status = {}
            for item in response['Items']:
                source = item['data_source']
                if source not in sources_status:
                    sources_status[source] = {
                        'name': source,
                        'last_success': None,
                        'last_attempt': None,
                        'success_count': 0,
                        'failure_count': 0,
                        'total_records': 0
                    }
                
                if item['success']:
                    sources_status[source]['success_count'] += 1
                    sources_status[source]['total_records'] += item.get('record_count', 0)
                    if not sources_status[source]['last_success'] or item['timestamp'] > sources_status[source]['last_success']:
                        sources_status[source]['last_success'] = item['timestamp']
                else:
                    sources_status[source]['failure_count'] += 1
                
                if not sources_status[source]['last_attempt'] or item['timestamp'] > sources_status[source]['last_attempt']:
                    sources_status[source]['last_attempt'] = item['timestamp']
            
            return self.create_response(200, {
                'data_sources': list(sources_status.values()),
                'total_sources': len(sources_status),
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Failed to get data sources status: {str(e)}")
            return self.create_response(500, {
                'error': 'Failed to retrieve data sources status',
                'message': str(e)
            })
    
    def get_recent_data(self, data_source: str, limit: int = 50) -> Dict:
        """Get recent data for a specific source"""
        try:
            # Query recent data from metadata table
            response = self.table.query(
                KeyConditionExpression='data_source = :source',
                ExpressionAttributeValues={':source': data_source},
                ScanIndexForward=False,  # Sort by timestamp descending
                Limit=limit
            )
            
            recent_data = []
            for item in response['Items']:
                recent_data.append({
                    'timestamp': item['timestamp'],
                    'success': item['success'],
                    'record_count': item.get('record_count', 0),
                    'file_key': item.get('file_key'),
                    'data_hash': item.get('data_hash')
                })
            
            return self.create_response(200, {
                'data_source': data_source,
                'recent_collections': recent_data,
                'count': len(recent_data),
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Failed to get recent data for {data_source}: {str(e)}")
            return self.create_response(500, {
                'error': f'Failed to retrieve recent data for {data_source}',
                'message': str(e)
            })
    
    def get_dashboard_summary(self) -> Dict:
        """Get summary data for dashboard"""
        try:
            # Get data from last 24 hours
            yesterday = datetime.utcnow() - timedelta(days=1)
            
            response = self.table.scan(
                FilterExpression='#ts > :timestamp',
                ExpressionAttributeNames={'#ts': 'timestamp'},
                ExpressionAttributeValues={
                    ':timestamp': yesterday.isoformat()
                }
            )
            
            # Calculate summary statistics
            total_collections = len(response['Items'])
            successful_collections = sum(1 for item in response['Items'] if item['success'])
            total_records = sum(item.get('record_count', 0) for item in response['Items'])
            
            # Get unique data sources
            data_sources = set(item['data_source'] for item in response['Items'])
            
            # Calculate success rate
            success_rate = (successful_collections / total_collections * 100) if total_collections > 0 else 0
            
            return self.create_response(200, {
                'summary': {
                    'total_collections_24h': total_collections,
                    'successful_collections_24h': successful_collections,
                    'success_rate_percentage': round(success_rate, 2),
                    'total_records_24h': total_records,
                    'active_data_sources': len(data_sources),
                    'data_sources': list(data_sources)
                },
                'timestamp': datetime.utcnow().isoformat(),
                'period': '24 hours'
            })
            
        except Exception as e:
            logger.error(f"Failed to get dashboard summary: {str(e)}")
            return self.create_response(500, {
                'error': 'Failed to retrieve dashboard summary',
                'message': str(e)
            })
    
    def get_s3_files(self, prefix: str = '', limit: int = 20) -> Dict:
        """Get list of S3 files with metadata"""
        try:
            # List objects in S3 bucket
            response = s3_client.list_objects_v2(
                Bucket=S3_BUCKET,
                Prefix=prefix,
                MaxKeys=limit
            )
            
            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    # Get object metadata
                    try:
                        metadata_response = s3_client.head_object(
                            Bucket=S3_BUCKET,
                            Key=obj['Key']
                        )
                        metadata = metadata_response.get('Metadata', {})
                    except Exception as e:
                        logger.warning(f"Failed to get metadata for {obj['Key']}: {str(e)}")
                        metadata = {}
                    
                    files.append({
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'].isoformat(),
                        'data_source': metadata.get('data_source', 'unknown'),
                        'record_count': metadata.get('record_count', 'unknown'),
                        'collection_time': metadata.get('collection_time', 'unknown')
                    })
            
            return self.create_response(200, {
                'files': files,
                'count': len(files),
                'bucket': S3_BUCKET,
                'prefix': prefix,
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Failed to list S3 files: {str(e)}")
            return self.create_response(500, {
                'error': 'Failed to retrieve S3 files',
                'message': str(e)
            })
    
    def get_health_check(self) -> Dict:
        """Health check endpoint"""
        try:
            # Test DynamoDB connection
            dynamodb_healthy = True
            try:
                self.table.meta.client.describe_table(TableName=DYNAMODB_TABLE)
            except Exception:
                dynamodb_healthy = False
            
            # Test S3 connection
            s3_healthy = True
            try:
                s3_client.head_bucket(Bucket=S3_BUCKET)
            except Exception:
                s3_healthy = False
            
            overall_healthy = dynamodb_healthy and s3_healthy
            
            return self.create_response(200 if overall_healthy else 503, {
                'status': 'healthy' if overall_healthy else 'unhealthy',
                'services': {
                    'dynamodb': 'healthy' if dynamodb_healthy else 'unhealthy',
                    's3': 'healthy' if s3_healthy else 'unhealthy'
                },
                'timestamp': datetime.utcnow().isoformat(),
                'environment': ENVIRONMENT,
                'version': '1.0.0'
            })
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return self.create_response(500, {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })

def lambda_handler(event, context):
    """
    Main Lambda handler function
    
    Args:
        event: AWS Lambda event object from API Gateway
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response
    """
    
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        # Initialize API handler
        handler = APIHandler()
        
        # Get HTTP method and path
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        path_parameters = event.get('pathParameters') or {}
        query_parameters = event.get('queryStringParameters') or {}
        
        # Handle CORS preflight
        if http_method == 'OPTIONS':
            return handler.handle_options()
        
        # Route requests based on path
        if path == '/health':
            return handler.get_health_check()
        
        elif path == '/api/data-sources':
            return handler.get_data_sources_status()
        
        elif path == '/api/dashboard/summary':
            return handler.get_dashboard_summary()
        
        elif path.startswith('/api/data-sources/') and path.endswith('/recent'):
            # Extract data source from path
            data_source = path.split('/')[3]  # /api/data-sources/{source}/recent
            limit = int(query_parameters.get('limit', 50))
            return handler.get_recent_data(data_source, limit)
        
        elif path == '/api/files':
            prefix = query_parameters.get('prefix', '')
            limit = int(query_parameters.get('limit', 20))
            return handler.get_s3_files(prefix, limit)
        
        else:
            # Unknown endpoint
            return handler.create_response(404, {
                'error': 'Endpoint not found',
                'path': path,
                'method': http_method,
                'available_endpoints': [
                    '/health',
                    '/api/data-sources',
                    '/api/dashboard/summary',
                    '/api/data-sources/{source}/recent',
                    '/api/files'
                ]
            })
        
    except Exception as e:
        logger.error(f"Lambda execution failed: {str(e)}")
        
        # Create error response
        handler = APIHandler()
        return handler.create_response(500, {
            'error': 'Internal server error',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })

# For local testing
if __name__ == "__main__":
    # Test events for different endpoints
    test_events = [
        {
            'httpMethod': 'GET',
            'path': '/health',
            'pathParameters': None,
            'queryStringParameters': None
        },
        {
            'httpMethod': 'GET',
            'path': '/api/data-sources',
            'pathParameters': None,
            'queryStringParameters': None
        },
        {
            'httpMethod': 'GET',
            'path': '/api/dashboard/summary',
            'pathParameters': None,
            'queryStringParameters': None
        }
    ]
    
    test_context = type('Context', (), {
        'function_name': 'nexus-api-handler-test',
        'aws_request_id': 'test-request-id'
    })()
    
    for i, test_event in enumerate(test_events):
        print(f"\n--- Test {i+1}: {test_event['path']} ---")
        result = lambda_handler(test_event, test_context)
        print(json.dumps(result, indent=2))
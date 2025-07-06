#!/usr/bin/env python3
"""
NEXUS_ENA SFTP Data Collector
Securely downloads power market data from LSEG SFTP servers
"""

import os
import logging
import json
from datetime import datetime, timedelta
import paramiko
import boto3
import pandas as pd
from io import StringIO

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class LSEGSFTPCollector:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.ssm_client = boto3.client('ssm')
        self.dynamodb = boto3.resource('dynamodb')
        
        # Environment variables
        self.s3_bucket = os.environ.get('S3_BUCKET', 'nexus-ena-data-lake-prod')
        self.dynamodb_table = os.environ.get('DYNAMODB_TABLE', 'nexus-ena-metadata-prod')
        self.sftp_host = os.environ.get('SFTP_HOST')
        self.sftp_port = int(os.environ.get('SFTP_PORT', '22'))
        self.sftp_username = os.environ.get('SFTP_USERNAME')
        
        # SSH key from AWS Systems Manager
        self.ssh_key_parameter = '/nexus-ena/sftp-private-key'
        
    def get_ssh_key(self):
        """Retrieve SSH private key from AWS Systems Manager"""
        try:
            response = self.ssm_client.get_parameter(
                Name=self.ssh_key_parameter,
                WithDecryption=True
            )
            return response['Parameter']['Value']
        except Exception as e:
            logger.error(f"Failed to retrieve SSH key: {str(e)}")
            raise
    
    def connect_sftp(self):
        """Establish SFTP connection using SSH key authentication"""
        try:
            # Get SSH key
            private_key_content = self.get_ssh_key()
            
            # Create SSH client
            ssh_client = paramiko.SSHClient()
            ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Load private key
            key = paramiko.RSAKey.from_private_key(StringIO(private_key_content))
            
            # Connect
            ssh_client.connect(
                hostname=self.sftp_host,
                port=self.sftp_port,
                username=self.sftp_username,
                pkey=key,
                timeout=30
            )
            
            # Open SFTP session
            sftp_client = ssh_client.open_sftp()
            logger.info(f"Successfully connected to SFTP server: {self.sftp_host}")
            
            return ssh_client, sftp_client
            
        except Exception as e:
            logger.error(f"SFTP connection failed: {str(e)}")
            raise
    
    def list_available_files(self, sftp_client, remote_path='/data'):
        """List available files on SFTP server for today"""
        try:
            today = datetime.now().strftime('%Y%m%d')
            files = []
            
            # List files in remote directory
            for filename in sftp_client.listdir(remote_path):
                if today in filename and filename.endswith('.csv'):
                    files.append(filename)
            
            logger.info(f"Found {len(files)} files for {today}")
            return files
            
        except Exception as e:
            logger.error(f"Failed to list files: {str(e)}")
            return []
    
    def download_and_process_file(self, sftp_client, remote_file, remote_path='/data'):
        """Download file from SFTP and convert to Parquet format"""
        try:
            remote_filepath = f"{remote_path}/{remote_file}"
            
            # Download file content
            with sftp_client.file(remote_filepath, 'r') as remote_file_obj:
                csv_content = remote_file_obj.read().decode('utf-8')
            
            # Convert CSV to DataFrame
            df = pd.read_csv(StringIO(csv_content))
            
            # Add metadata columns
            df['collection_timestamp'] = datetime.utcnow().isoformat()
            df['source_file'] = remote_file
            
            # Convert to Parquet
            parquet_buffer = df.to_parquet(index=False)
            
            # Generate S3 key
            date_prefix = datetime.now().strftime('%Y/%m/%d')
            s3_key = f"raw-data/{date_prefix}/lseg_{remote_file.replace('.csv', '.parquet')}"
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=s3_key,
                Body=parquet_buffer,
                ServerSideEncryption='AES256'
            )
            
            logger.info(f"Successfully processed and uploaded: {s3_key}")
            
            # Update metadata in DynamoDB
            self.update_metadata(remote_file, s3_key, len(df))
            
            return s3_key
            
        except Exception as e:
            logger.error(f"Failed to process file {remote_file}: {str(e)}")
            return None
    
    def update_metadata(self, filename, s3_key, record_count):
        """Update file metadata in DynamoDB"""
        try:
            table = self.dynamodb.Table(self.dynamodb_table)
            
            table.put_item(
                Item={
                    'file_id': filename,
                    'collection_date': datetime.now().strftime('%Y-%m-%d'),
                    's3_location': s3_key,
                    'record_count': record_count,
                    'status': 'completed',
                    'timestamp': datetime.utcnow().isoformat(),
                    'source': 'lseg_sftp'
                }
            )
            
            logger.info(f"Metadata updated for {filename}")
            
        except Exception as e:
            logger.error(f"Failed to update metadata: {str(e)}")
    
    def collect_daily_data(self):
        """Main collection process"""
        ssh_client = None
        sftp_client = None
        
        try:
            logger.info("Starting LSEG SFTP data collection")
            
            # Connect to SFTP
            ssh_client, sftp_client = self.connect_sftp()
            
            # List available files
            files = self.list_available_files(sftp_client)
            
            if not files:
                logger.warning("No files found for today")
                return
            
            # Process each file
            processed_files = []
            for filename in files:
                s3_key = self.download_and_process_file(sftp_client, filename)
                if s3_key:
                    processed_files.append(s3_key)
            
            logger.info(f"Collection completed. Processed {len(processed_files)} files")
            
        except Exception as e:
            logger.error(f"Collection failed: {str(e)}")
            raise
            
        finally:
            # Clean up connections
            if sftp_client:
                sftp_client.close()
            if ssh_client:
                ssh_client.close()
            
            logger.info("SFTP connections closed")

def main():
    """Entry point for ECS task"""
    try:
        collector = LSEGSFTPCollector()
        collector.collect_daily_data()
        
    except Exception as e:
        logger.error(f"Application failed: {str(e)}")
        exit(1)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
NEXUS_ENA Weekly Analysis Engine
Main orchestrator for weekly energy market data analysis using Claude AI
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import json
import traceback

# Core libraries
import pandas as pd
import numpy as np
import boto3
from anthropic import Anthropic
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
ssm_client = boto3.client('ssm')

# Environment variables
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'prod')
S3_BUCKET = os.environ.get('S3_BUCKET', '')
DYNAMODB_TABLE = os.environ.get('DYNAMODB_TABLE', '')

class EnergyMarketAnalyzer:
    """Main analysis engine for energy market data"""
    
    def __init__(self):
        self.s3_bucket = S3_BUCKET
        self.dynamodb_table = dynamodb.Table(DYNAMODB_TABLE)
        self.claude_client = None
        self.analysis_results = {}
        self.setup_claude_client()
        
        # Create output directories
        self.output_dir = Path('/tmp/analysis')
        self.output_dir.mkdir(exist_ok=True)
        
        # Configure visualization style
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
    
    def setup_claude_client(self):
        """Initialize Claude AI client"""
        try:
            # Get Claude API key from Parameter Store
            response = ssm_client.get_parameter(
                Name='/nexus-ena/claude-api-key',
                WithDecryption=True
            )
            api_key = response['Parameter']['Value']
            self.claude_client = Anthropic(api_key=api_key)
            logger.info("Claude AI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Claude client: {str(e)}")
            raise
    
    async def load_recent_data(self, days_back: int = 7) -> Dict[str, pd.DataFrame]:
        """Load recent data from S3 for analysis"""
        logger.info(f"Loading data from the last {days_back} days")
        
        datasets = {}
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        try:
            # List objects in the raw-data folder
            paginator = s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.s3_bucket, Prefix='raw-data/')
            
            for page in pages:
                if 'Contents' not in page:
                    continue
                    
                for obj in page['Contents']:
                    key = obj['Key']
                    last_modified = obj['LastModified'].replace(tzinfo=None)
                    
                    # Only load recent data
                    if last_modified < cutoff_date:
                        continue
                    
                    # Extract data source from filename
                    filename = key.split('/')[-1]
                    data_source = filename.split('_')[0]
                    
                    try:
                        # Download and read Parquet file
                        response = s3_client.get_object(Bucket=self.s3_bucket, Key=key)
                        df = pd.read_parquet(BytesIO(response['Body'].read()))
                        
                        if data_source not in datasets:
                            datasets[data_source] = []
                        datasets[data_source].append(df)
                        
                        logger.info(f"Loaded {len(df)} records from {key}")
                        
                    except Exception as e:
                        logger.warning(f"Failed to load {key}: {str(e)}")
                        continue
            
            # Combine datasets by source
            combined_datasets = {}
            for source, dfs in datasets.items():
                if dfs:
                    combined_df = pd.concat(dfs, ignore_index=True)
                    combined_df['timestamp'] = pd.to_datetime(combined_df['timestamp'])
                    combined_datasets[source] = combined_df
                    logger.info(f"Combined {source}: {len(combined_df)} total records")
            
            return combined_datasets
            
        except Exception as e:
            logger.error(f"Failed to load recent data: {str(e)}")
            return {}
    
    def analyze_power_markets(self, power_data: pd.DataFrame) -> Dict[str, Any]:
        """Analyze power market trends and patterns"""
        analysis = {
            'summary': {},
            'regional_analysis': {},
            'price_volatility': {},
            'supply_demand': {}
        }
        
        try:
            if power_data.empty:
                return analysis
            
            # Filter power price data
            power_prices = power_data[power_data['data_type'] == 'power_prices'].copy()
            renewable_gen = power_data[power_data['data_type'] == 'renewable_generation'].copy()
            
            if not power_prices.empty:
                # Overall market summary
                analysis['summary'] = {
                    'avg_price': float(power_prices['price'].mean()),
                    'price_volatility': float(power_prices['price'].std()),
                    'min_price': float(power_prices['price'].min()),
                    'max_price': float(power_prices['price'].max()),
                    'total_demand': float(power_prices['demand'].sum()),
                    'total_supply': float(power_prices['supply'].sum())
                }
                
                # Regional analysis
                regional_stats = power_prices.groupby('region').agg({
                    'price': ['mean', 'std', 'min', 'max'],
                    'demand': 'mean',
                    'supply': 'mean'
                }).round(2)
                
                analysis['regional_analysis'] = regional_stats.to_dict()
                
                # Price volatility analysis
                power_prices['price_change'] = power_prices.groupby('region')['price'].pct_change()
                volatility_by_region = power_prices.groupby('region')['price_change'].std()
                analysis['price_volatility'] = volatility_by_region.to_dict()
                
                # Supply-demand balance
                power_prices['supply_demand_ratio'] = power_prices['supply'] / power_prices['demand']
                analysis['supply_demand'] = {
                    'avg_ratio': float(power_prices['supply_demand_ratio'].mean()),
                    'tight_markets': power_prices[power_prices['supply_demand_ratio'] < 1.1]['region'].tolist()
                }
            
            if not renewable_gen.empty:
                # Renewable generation analysis
                renewable_stats = renewable_gen.groupby('source').agg({
                    'capacity': 'mean',
                    'generation': 'mean'
                }).round(2)
                
                renewable_gen['capacity_factor'] = renewable_gen['generation'] / renewable_gen['capacity']
                capacity_factors = renewable_gen.groupby('source')['capacity_factor'].mean()
                
                analysis['renewable_analysis'] = {
                    'generation_stats': renewable_stats.to_dict(),
                    'capacity_factors': capacity_factors.to_dict()
                }
            
            logger.info("Power market analysis completed")
            return analysis
            
        except Exception as e:
            logger.error(f"Power market analysis failed: {str(e)}")
            return analysis
    
    def analyze_weather_impact(self, weather_data: pd.DataFrame, power_data: pd.DataFrame) -> Dict[str, Any]:
        """Analyze weather impact on energy markets"""
        analysis = {
            'temperature_impact': {},
            'weather_correlations': {},
            'extreme_weather_events': []
        }
        
        try:
            if weather_data.empty or power_data.empty:
                return analysis
            
            # Merge weather and power data by region/timestamp
            weather_data['region_mapped'] = weather_data['region'].map({
                'New York': 'NYISO',
                'California': 'CAISO', 
                'Texas': 'ERCOT',
                'Pennsylvania': 'PJM'
            })
            
            power_prices = power_data[power_data['data_type'] == 'power_prices'].copy()
            
            # Calculate temperature impact on prices
            temp_price_corr = {}
            for region in weather_data['region_mapped'].unique():
                if pd.isna(region):
                    continue
                    
                region_weather = weather_data[weather_data['region_mapped'] == region]
                region_power = power_prices[power_prices['region'] == region]
                
                if len(region_weather) > 0 and len(region_power) > 0:
                    # Simple correlation analysis
                    if len(region_weather) == len(region_power):
                        correlation = np.corrcoef(region_weather['temperature'], region_power['price'])[0, 1]
                        temp_price_corr[region] = float(correlation) if not np.isnan(correlation) else 0.0
            
            analysis['temperature_impact'] = temp_price_corr
            
            # Identify extreme weather events
            temp_threshold = weather_data['temperature'].quantile(0.95)
            extreme_temp_events = weather_data[weather_data['temperature'] > temp_threshold]
            
            for _, event in extreme_temp_events.iterrows():
                analysis['extreme_weather_events'].append({
                    'region': event['region'],
                    'temperature': float(event['temperature']),
                    'wind_speed': float(event['wind_speed']),
                    'timestamp': event['timestamp'].isoformat() if pd.notnull(event['timestamp']) else None
                })
            
            logger.info("Weather impact analysis completed")
            return analysis
            
        except Exception as e:
            logger.error(f"Weather impact analysis failed: {str(e)}")
            return analysis
    
    def analyze_economic_indicators(self, economic_data: pd.DataFrame) -> Dict[str, Any]:
        """Analyze economic indicators affecting energy markets"""
        analysis = {
            'commodity_trends': {},
            'market_indicators': {},
            'correlations': {}
        }
        
        try:
            if economic_data.empty:
                return analysis
            
            # Group by indicator type
            indicators = economic_data.groupby('indicator')['value'].agg(['mean', 'std', 'min', 'max']).round(2)
            analysis['market_indicators'] = indicators.to_dict()
            
            # Focus on energy-related commodities
            energy_commodities = ['crude_oil_wti', 'natural_gas_henry_hub', 'coal_price']
            energy_data = economic_data[economic_data['indicator'].isin(energy_commodities)]
            
            if not energy_data.empty:
                commodity_stats = energy_data.groupby('indicator')['value'].agg(['mean', 'std']).round(2)
                analysis['commodity_trends'] = commodity_stats.to_dict()
            
            # Calculate correlations between key indicators
            pivot_data = economic_data.pivot(columns='indicator', values='value')
            if len(pivot_data.columns) > 1:
                correlations = pivot_data.corr().round(3)
                analysis['correlations'] = correlations.to_dict()
            
            logger.info("Economic indicators analysis completed")
            return analysis
            
        except Exception as e:
            logger.error(f"Economic indicators analysis failed: {str(e)}")
            return analysis
    
    async def generate_claude_insights(self, analysis_data: Dict[str, Any]) -> str:
        """Generate AI-powered insights using Claude"""
        try:
            # Prepare data summary for Claude
            data_summary = {
                'power_markets': analysis_data.get('power_markets', {}),
                'weather_impact': analysis_data.get('weather_impact', {}),
                'economic_indicators': analysis_data.get('economic_indicators', {}),
                'analysis_timestamp': datetime.utcnow().isoformat()
            }
            
            prompt = f"""
            As an expert energy market analyst, please analyze the following weekly energy market data and provide strategic insights:

            Data Summary:
            {json.dumps(data_summary, indent=2, default=str)}

            Please provide a comprehensive analysis covering:

            1. **Market Overview**: Key trends and patterns in power markets
            2. **Regional Analysis**: Regional price variations and supply-demand dynamics
            3. **Weather Impact**: How weather conditions affected energy demand and pricing
            4. **Economic Factors**: Impact of commodity prices and economic indicators
            5. **Risk Assessment**: Potential market risks and volatility factors
            6. **Strategic Recommendations**: Actionable insights for energy market participants
            7. **Outlook**: Short-term forecast and key factors to monitor

            Please structure your response in clear sections with specific data points and actionable recommendations.
            Focus on practical insights that would be valuable for energy market participants.
            """
            
            message = self.claude_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=4000,
                temperature=0.3,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            insights = message.content[0].text
            logger.info("Claude insights generated successfully")
            return insights
            
        except Exception as e:
            logger.error(f"Failed to generate Claude insights: {str(e)}")
            return f"AI analysis unavailable due to technical issues. Error: {str(e)}"
    
    def create_visualizations(self, analysis_data: Dict[str, Any]) -> List[str]:
        """Create data visualizations"""
        viz_files = []
        
        try:
            # Power market price trends
            if 'power_markets' in analysis_data and analysis_data['power_markets'].get('regional_analysis'):
                fig, ax = plt.subplots(figsize=(12, 8))
                
                regional_data = analysis_data['power_markets']['regional_analysis']
                regions = list(regional_data.keys())
                avg_prices = [regional_data[region]['price']['mean'] for region in regions]
                price_volatility = [regional_data[region]['price']['std'] for region in regions]
                
                x = np.arange(len(regions))
                width = 0.35
                
                bars1 = ax.bar(x - width/2, avg_prices, width, label='Average Price ($/MWh)', alpha=0.8)
                bars2 = ax.bar(x + width/2, price_volatility, width, label='Price Volatility (Std Dev)', alpha=0.8)
                
                ax.set_xlabel('Region')
                ax.set_ylabel('Price ($/MWh)')
                ax.set_title('Regional Power Market Analysis')
                ax.set_xticks(x)
                ax.set_xticklabels(regions)
                ax.legend()
                ax.grid(True, alpha=0.3)
                
                # Add value labels on bars
                for bar in bars1:
                    height = bar.get_height()
                    ax.text(bar.get_x() + bar.get_width()/2., height,
                           f'${height:.2f}', ha='center', va='bottom')
                
                for bar in bars2:
                    height = bar.get_height()
                    ax.text(bar.get_x() + bar.get_width()/2., height,
                           f'{height:.2f}', ha='center', va='bottom')
                
                plt.tight_layout()
                viz_file = self.output_dir / 'power_market_analysis.png'
                plt.savefig(viz_file, dpi=300, bbox_inches='tight')
                plt.close()
                viz_files.append(str(viz_file))
                logger.info("Power market visualization created")
            
            # Economic indicators chart
            if 'economic_indicators' in analysis_data and analysis_data['economic_indicators'].get('market_indicators'):
                fig, ax = plt.subplots(figsize=(12, 6))
                
                indicators = analysis_data['economic_indicators']['market_indicators']
                indicator_names = list(indicators.keys())
                values = [indicators[ind]['mean'] for ind in indicator_names]
                
                bars = ax.barh(indicator_names, values, alpha=0.8)
                ax.set_xlabel('Value')
                ax.set_title('Economic Indicators Overview')
                ax.grid(True, alpha=0.3)
                
                # Add value labels
                for i, bar in enumerate(bars):
                    width = bar.get_width()
                    ax.text(width, bar.get_y() + bar.get_height()/2,
                           f'{width:.2f}', ha='left', va='center')
                
                plt.tight_layout()
                viz_file = self.output_dir / 'economic_indicators.png'
                plt.savefig(viz_file, dpi=300, bbox_inches='tight')
                plt.close()
                viz_files.append(str(viz_file))
                logger.info("Economic indicators visualization created")
            
            return viz_files
            
        except Exception as e:
            logger.error(f"Visualization creation failed: {str(e)}")
            return viz_files
    
    def generate_pdf_report(self, analysis_data: Dict[str, Any], claude_insights: str, viz_files: List[str]) -> str:
        """Generate comprehensive PDF report"""
        try:
            report_file = self.output_dir / f"nexus_ena_weekly_report_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
            
            # Create PDF document
            doc = SimpleDocTemplate(str(report_file), pagesize=A4)
            styles = getSampleStyleSheet()
            story = []
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                textColor=colors.darkblue
            )
            story.append(Paragraph("NEXUS_ENA Weekly Energy Market Report", title_style))
            story.append(Spacer(1, 20))
            
            # Report metadata
            report_date = datetime.utcnow().strftime('%B %d, %Y')
            story.append(Paragraph(f"<b>Report Date:</b> {report_date}", styles['Normal']))
            story.append(Paragraph(f"<b>Analysis Period:</b> {report_date} (7-day lookback)", styles['Normal']))
            story.append(Spacer(1, 20))
            
            # Executive Summary
            story.append(Paragraph("Executive Summary", styles['Heading2']))
            if 'power_markets' in analysis_data and analysis_data['power_markets'].get('summary'):
                summary = analysis_data['power_markets']['summary']
                story.append(Paragraph(
                    f"Average power price: ${summary.get('avg_price', 0):.2f}/MWh<br/>"
                    f"Price volatility: {summary.get('price_volatility', 0):.2f}<br/>"
                    f"Total demand: {summary.get('total_demand', 0):,.0f} MW<br/>"
                    f"Total supply: {summary.get('total_supply', 0):,.0f} MW",
                    styles['Normal']
                ))
            story.append(Spacer(1, 20))
            
            # Add visualizations
            for viz_file in viz_files:
                if Path(viz_file).exists():
                    img = Image(viz_file, width=500, height=300)
                    story.append(img)
                    story.append(Spacer(1, 20))
            
            # Claude AI Insights
            story.append(Paragraph("AI-Powered Market Analysis", styles['Heading2']))
            
            # Split Claude insights into paragraphs
            insight_paragraphs = claude_insights.split('\n\n')
            for paragraph in insight_paragraphs:
                if paragraph.strip():
                    story.append(Paragraph(paragraph.strip(), styles['Normal']))
                    story.append(Spacer(1, 12))
            
            # Data appendix
            story.append(Paragraph("Data Appendix", styles['Heading2']))
            
            # Power markets data table
            if 'power_markets' in analysis_data and analysis_data['power_markets'].get('regional_analysis'):
                story.append(Paragraph("Regional Power Market Data", styles['Heading3']))
                
                regional_data = analysis_data['power_markets']['regional_analysis']
                table_data = [['Region', 'Avg Price ($/MWh)', 'Volatility', 'Avg Demand (MW)']]
                
                for region in regional_data.keys():
                    data = regional_data[region]
                    table_data.append([
                        region,
                        f"${data['price']['mean']:.2f}",
                        f"{data['price']['std']:.2f}",
                        f"{data['demand']['mean']:,.0f}"
                    ])
                
                table = Table(table_data)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(table)
                story.append(Spacer(1, 20))
            
            # Footer
            story.append(Spacer(1, 30))
            story.append(Paragraph(
                "Generated by NEXUS_ENA - Energy Nexus Analytics Platform<br/>"
                f"Report generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC",
                styles['Italic']
            ))
            
            # Build PDF
            doc.build(story)
            logger.info(f"PDF report generated: {report_file}")
            return str(report_file)
            
        except Exception as e:
            logger.error(f"PDF report generation failed: {str(e)}")
            return ""
    
    async def save_results_to_s3(self, analysis_data: Dict[str, Any], claude_insights: str, 
                                pdf_file: str, viz_files: List[str]) -> bool:
        """Save analysis results to S3"""
        try:
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            
            # Save JSON analysis data
            json_key = f"reports/json/weekly_analysis_{timestamp}.json"
            analysis_json = {
                'timestamp': datetime.utcnow().isoformat(),
                'analysis_data': analysis_data,
                'claude_insights': claude_insights,
                'metadata': {
                    'environment': ENVIRONMENT,
                    'analysis_version': '1.0.0'
                }
            }
            
            s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=json_key,
                Body=json.dumps(analysis_json, default=str, indent=2),
                ContentType='application/json',
                ServerSideEncryption='AES256'
            )
            logger.info(f"JSON analysis saved to s3://{self.s3_bucket}/{json_key}")
            
            # Save PDF report
            if pdf_file and Path(pdf_file).exists():
                pdf_key = f"reports/pdf/weekly_report_{timestamp}.pdf"
                with open(pdf_file, 'rb') as f:
                    s3_client.put_object(
                        Bucket=self.s3_bucket,
                        Key=pdf_key,
                        Body=f.read(),
                        ContentType='application/pdf',
                        ServerSideEncryption='AES256'
                    )
                logger.info(f"PDF report saved to s3://{self.s3_bucket}/{pdf_key}")
            
            # Save visualizations
            for viz_file in viz_files:
                if Path(viz_file).exists():
                    viz_key = f"reports/visualizations/{Path(viz_file).name}_{timestamp}"
                    with open(viz_file, 'rb') as f:
                        s3_client.put_object(
                            Bucket=self.s3_bucket,
                            Key=viz_key,
                            Body=f.read(),
                            ContentType='image/png',
                            ServerSideEncryption='AES256'
                        )
                    logger.info(f"Visualization saved to s3://{self.s3_bucket}/{viz_key}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to save results to S3: {str(e)}")
            return False
    
    async def update_analysis_metadata(self, success: bool, error_message: str = None):
        """Update analysis metadata in DynamoDB"""
        try:
            timestamp = datetime.utcnow().isoformat()
            
            item = {
                'data_source': 'weekly_analysis',
                'timestamp': timestamp,
                'success': success,
                'analysis_type': 'comprehensive_market_analysis',
                'environment': ENVIRONMENT,
                'ttl': int((datetime.utcnow() + timedelta(days=90)).timestamp())
            }
            
            if error_message:
                item['error_message'] = error_message
            
            self.dynamodb_table.put_item(Item=item)
            logger.info("Analysis metadata updated in DynamoDB")
            
        except Exception as e:
            logger.error(f"Failed to update analysis metadata: {str(e)}")
    
    async def run_weekly_analysis(self) -> Dict[str, Any]:
        """Main analysis workflow"""
        logger.info("Starting weekly energy market analysis")
        start_time = datetime.utcnow()
        
        try:
            # Step 1: Load recent data
            logger.info("Step 1: Loading recent data from S3")
            datasets = await self.load_recent_data(days_back=7)
            
            if not datasets:
                raise Exception("No data available for analysis")
            
            # Step 2: Perform individual analyses
            logger.info("Step 2: Performing market analysis")
            analysis_results = {}
            
            if 'lseg' in datasets:
                analysis_results['power_markets'] = self.analyze_power_markets(datasets['lseg'])
            
            if 'weather' in datasets:
                weather_analysis = self.analyze_weather_impact(
                    datasets['weather'], 
                    datasets.get('lseg', pd.DataFrame())
                )
                analysis_results['weather_impact'] = weather_analysis
            
            if 'economic' in datasets:
                analysis_results['economic_indicators'] = self.analyze_economic_indicators(datasets['economic'])
            
            # Step 3: Generate AI insights
            logger.info("Step 3: Generating Claude AI insights")
            claude_insights = await self.generate_claude_insights(analysis_results)
            
            # Step 4: Create visualizations
            logger.info("Step 4: Creating visualizations")
            viz_files = self.create_visualizations(analysis_results)
            
            # Step 5: Generate PDF report
            logger.info("Step 5: Generating PDF report")
            pdf_file = self.generate_pdf_report(analysis_results, claude_insights, viz_files)
            
            # Step 6: Save results to S3
            logger.info("Step 6: Saving results to S3")
            save_success = await self.save_results_to_s3(
                analysis_results, claude_insights, pdf_file, viz_files
            )
            
            # Step 7: Update metadata
            await self.update_analysis_metadata(success=True)
            
            # Calculate execution time
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            summary = {
                'status': 'success',
                'execution_time_seconds': execution_time,
                'datasets_processed': list(datasets.keys()),
                'total_records_analyzed': sum(len(df) for df in datasets.values()),
                'visualizations_created': len(viz_files),
                'pdf_generated': bool(pdf_file),
                'results_saved_to_s3': save_success,
                'claude_insights_generated': bool(claude_insights),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            logger.info(f"Weekly analysis completed successfully in {execution_time:.2f} seconds")
            return summary
            
        except Exception as e:
            error_message = f"Weekly analysis failed: {str(e)}"
            logger.error(error_message)
            logger.error(traceback.format_exc())
            
            # Update metadata with failure
            await self.update_analysis_metadata(success=False, error_message=error_message)
            
            return {
                'status': 'failed',
                'error': error_message,
                'timestamp': datetime.utcnow().isoformat()
            }

async def main():
    """Main entry point"""
    logger.info("NEXUS_ENA Weekly Analysis Engine Starting")
    
    # Validate environment variables
    if not S3_BUCKET or not DYNAMODB_TABLE:
        logger.error("Missing required environment variables: S3_BUCKET, DYNAMODB_TABLE")
        sys.exit(1)
    
    try:
        # Initialize analyzer
        analyzer = EnergyMarketAnalyzer()
        
        # Run analysis
        result = await analyzer.run_weekly_analysis()
        
        # Log final result
        logger.info(f"Analysis completed with status: {result['status']}")
        
        if result['status'] == 'success':
            logger.info(f"Processed {result['total_records_analyzed']} records in {result['execution_time_seconds']:.2f} seconds")
            sys.exit(0)
        else:
            logger.error(f"Analysis failed: {result.get('error', 'Unknown error')}")
            sys.exit(1)
    
    except Exception as e:
        logger.error(f"Critical error in main: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
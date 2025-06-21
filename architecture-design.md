# NEXUS_ENA - Energy Nexus Analytics Platform
## AWS Serverless Architecture Design Document

### Executive Summary
NEXUS_ENA is a cost-optimized energy market data analysis platform built on AWS serverless architecture, designed to operate under $20/month while providing comprehensive weekly analysis cycles.

### System Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│  External APIs  │────│  Data Collection │────│  Analysis Layer │────│  Presentation    │
│                 │    │     (Lambda)     │    │   (ECS Fargate) │    │   (React/S3)    │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤    ├──────────────────┤
│ • LSEG API      │    │ • Daily Ingestion│    │ • Weekly Batch  │    │ • React Dashboard│
│ • Reuters API   │    │ • Data Validation│    │ • Claude AI     │    │ • PDF Reports    │
│ • Bloomberg API │    │ • S3 Storage     │    │ • Statistical   │    │ • CloudFront CDN │
│ • Economic APIs │    │ • DynamoDB Meta  │    │   Analysis      │    │ • Mobile-First   │
│ • Weather APIs  │    │ • EventBridge    │    │ • Athena Queries│    │   UI/UX         │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────────┘
```

### Core Components

#### 1. Data Collection Layer (AWS Lambda)
- **Function**: `nexus-data-collector`
- **Runtime**: Python 3.9
- **Trigger**: EventBridge (daily 6:00 AM UTC)
- **Memory**: 512MB
- **Timeout**: 5 minutes
- **Responsibilities**:
  - API authentication & rate limiting
  - Data ingestion from external sources
  - Data validation & transformation
  - S3 storage (Parquet format)
  - DynamoDB metadata updates

#### 2. Analysis Layer (ECS Fargate)
- **Task**: `nexus-weekly-analysis`
- **Image**: Custom Python container with Claude SDK
- **vCPU**: 0.25 (256 CPU units)
- **Memory**: 0.5GB
- **Schedule**: Weekly (Sunday 2:00 AM UTC)
- **Duration**: 15-30 minutes
- **Responsibilities**:
  - Data aggregation from S3
  - Claude AI integration for insights
  - Statistical analysis & correlation
  - Report generation (PDF/JSON)
  - Athena query optimization

#### 3. Data Storage Architecture
```
S3 Bucket: nexus-ena-data/
├── raw-data/
│   ├── year=2024/month=01/day=15/
│   │   ├── lseg_power_prices.parquet
│   │   ├── weather_data.parquet
│   │   └── economic_indicators.parquet
├── processed-data/
│   ├── weekly-aggregates/
│   └── correlation-matrices/
├── reports/
│   ├── pdf/
│   └── json/
└── web-assets/
    ├── dashboard/
    └── static/
```

#### 4. Presentation Layer
- **Frontend**: React 18 + TypeScript
- **Hosting**: S3 + CloudFront
- **Authentication**: AWS Cognito
- **API**: API Gateway + Lambda
- **Features**:
  - Real-time dashboard (cached data)
  - Historical trend analysis
  - Interactive charts (Chart.js)
  - PDF report downloads
  - Mobile-responsive design

### Data Flow Architecture

1. **Daily Collection Cycle**:
   ```
   EventBridge → Lambda → External APIs → S3 (Raw) → DynamoDB (Metadata)
   ```

2. **Weekly Analysis Cycle**:
   ```
   ECS Task → S3 (Raw) → Claude Analysis → S3 (Processed) → Athena Views
   ```

3. **User Access**:
   ```
   User → CloudFront → S3 (Dashboard) → API Gateway → Lambda → S3/DynamoDB
   ```

### Scalability & Performance

#### Auto-scaling Configuration
- **Lambda**: Concurrent executions: 10 (cost optimization)
- **ECS**: Single task (sufficient for weekly processing)
- **API Gateway**: Rate limiting: 100 req/min per user
- **CloudFront**: Global edge caching (24h TTL)

#### Performance Optimizations
- Parquet columnar storage for efficient querying
- S3 Transfer Acceleration for large data sets
- Lambda provisioned concurrency disabled (cost saving)
- ECS Spot pricing consideration (90% cost reduction)

### Cost Optimization Strategy

#### S3 Lifecycle Management
```
Standard (0-30 days) → IA (30-90 days) → Glacier (90-365 days) → Deep Archive (1+ years)
```

#### Resource Right-sizing
- Lambda: 512MB memory (balance of cost/performance)
- ECS: Minimum viable resources (0.25 vCPU, 0.5GB RAM)
- RDS avoided (DynamoDB for metadata only)
- ElastiCache avoided (S3 caching strategy)

### Security Architecture

#### Authentication & Authorization
- **Frontend**: AWS Cognito User Pools
- **API**: JWT tokens with API Gateway authorizers
- **Backend**: IAM roles with least privilege
- **External APIs**: Secure credential storage (Systems Manager)

#### Data Protection
- **Encryption at Rest**: S3 (AES-256), DynamoDB (KMS)
- **Encryption in Transit**: TLS 1.2+ all communications
- **Network Security**: VPC endpoints, Security Groups
- **WAF**: DDoS protection, SQL injection prevention

#### Compliance & Monitoring
- **CloudTrail**: All API calls logged
- **CloudWatch**: Custom metrics & alarms
- **AWS Config**: Resource compliance tracking
- **Access Logging**: S3, CloudFront, API Gateway

### Disaster Recovery & Backup

#### Multi-Region Strategy
- **Primary**: us-east-1 (lowest cost)
- **Backup**: Cross-region S3 replication to us-west-2
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 24 hours

#### Backup Strategy
- **S3**: Versioning enabled, MFA delete protection
- **DynamoDB**: Point-in-time recovery (35 days)
- **Code**: GitHub repository with automated CI/CD
- **Infrastructure**: Terraform state in versioned S3 backend

### Monitoring & Alerting

#### Key Performance Indicators (KPIs)
- Data collection success rate (>99.5%)
- Analysis completion time (<30 minutes)
- Dashboard load time (<2 seconds)
- Monthly cost adherence (<$20)

#### Alert Configuration
```yaml
Critical Alerts:
  - Lambda function failures
  - ECS task failures
  - S3 data corruption
  - Cost threshold exceeded (>$18/month)

Warning Alerts:
  - API rate limit approaching
  - Storage quota approaching (80%)
  - Unusual data patterns detected
```

### Technology Stack Summary

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Infrastructure | Terraform | 1.6+ | IaC deployment |
| Backend | Python | 3.9+ | Data processing |
| AI Integration | Claude API | Latest | Analysis insights |
| Frontend | React + TypeScript | 18.x + 4.9+ | User interface |
| Database | DynamoDB | N/A | Metadata storage |
| Storage | S3 | N/A | Data lake |
| Analytics | Athena | N/A | SQL queries |
| CDN | CloudFront | N/A | Content delivery |
| Authentication | Cognito | N/A | User management |
| Orchestration | EventBridge | N/A | Scheduling |
| Compute | Lambda + ECS | N/A | Processing |

### Development & Deployment Pipeline

#### CI/CD Strategy
```
GitHub Repository → GitHub Actions → Terraform Plan → Manual Approval → Deploy
```

#### Environment Strategy
- **Development**: LocalStack + Docker Compose
- **Staging**: Reduced AWS resources (cost optimization)
- **Production**: Full architecture deployment

This architecture provides a robust, scalable, and cost-effective solution for energy market data analysis while maintaining high security standards and operational excellence.
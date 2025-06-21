# ===============================================
# NEXUS_ENA - Production Environment Variables
# ===============================================

# Basic Configuration
aws_region     = "us-east-1"
environment    = "prod"
project_name   = "nexus-ena"

# Data Retention Configuration
data_retention_days = {
  standard_to_ia   = 7      # Move to IA after 7 days
  ia_to_glacier    = 30     # Move to Glacier after 30 days
  glacier_to_deep  = 365    # Move to Deep Archive after 1 year
  final_expiration = 2555   # Delete after 7 years
}

# Lambda Configuration
lambda_config = {
  runtime       = "python3.9"
  memory_size   = 512       # Optimized for cost
  timeout       = 300       # 5 minutes max
  log_retention = 7         # 7 days log retention
}

# ECS Configuration
ecs_config = {
  cpu           = "2048"    # 2 vCPU
  memory        = "4096"    # 4GB RAM
  log_retention = 7         # 7 days log retention
}

# API Gateway Configuration
api_gateway_config = {
  throttle_rate_limit  = 100   # Requests per second
  throttle_burst_limit = 200   # Burst capacity
  endpoint_type        = "REGIONAL"
}

# CloudFront Configuration
cloudfront_config = {
  price_class = "PriceClass_100"  # US, Canada, Europe only
  default_ttl = 3600              # 1 hour
  max_ttl     = 86400             # 24 hours
  compress    = true              # Enable compression
}

# Cognito Configuration
cognito_config = {
  mfa_configuration = "OPTIONAL"
  password_policy = {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
}

# Monitoring Configuration
monitoring_config = {
  log_retention_days = 7
  metric_filters     = ["ERROR", "TIMEOUT", "MEMORY"]
  alarm_threshold    = 5
}

# Cost Optimization
cost_optimization = {
  enable_lifecycle_policies = true
  enable_intelligent_tiering = true
  reserved_capacity         = false  # Keep costs low
  spot_instances           = false   # N/A for serverless
}

# Security Configuration
security_config = {
  enable_waf            = true
  enable_access_logs    = true
  encryption_at_rest    = true
  encryption_in_transit = true
  enable_vpc_endpoints  = false  # Additional cost
}

# Data Sources (Production endpoints)
data_sources = {
  lseg_api_endpoint      = "https://api.lseg.com/v1"
  reuters_api_endpoint   = "https://api.reuters.com/v1"
  bloomberg_api_endpoint = "https://api.bloomberg.com/v1"
  economic_data_apis     = [
    "https://api.eia.gov/v2",
    "https://api.imf.org/v1",
    "https://api.worldbank.org/v2"
  ]
  weather_api_endpoint = "https://api.openweathermap.org/data/2.5"
}

# Analytics Configuration
analytics_config = {
  claude_api_endpoint = "https://api.anthropic.com/v1"
  analysis_schedule   = "cron(0 10 * * MON *)"  # Every Monday 10 AM UTC
  collection_schedule = "cron(0 9 * * ? *)"    # Daily 9 AM UTC
  enable_ml_features  = true
}

# Resource Tags
tags = {
  Project     = "NEXUS_ENA"
  Owner       = "DataEngineeringTeam"
  CostCenter  = "EnergyAnalytics"
  Environment = "prod"
  ManagedBy   = "Terraform"
  CostTarget  = "Under20USD"
  DataClass   = "BusinessCritical"
}
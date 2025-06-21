# ===============================================
# NEXUS_ENA - Development Environment Variables
# ===============================================

# Basic Configuration
aws_region     = "us-east-1"
environment    = "dev"
project_name   = "nexus-ena-dev"

# Data Retention Configuration (Shorter for dev)
data_retention_days = {
  standard_to_ia   = 3      # Move to IA after 3 days
  ia_to_glacier    = 7      # Move to Glacier after 7 days
  glacier_to_deep  = 30     # Move to Deep Archive after 30 days
  final_expiration = 90     # Delete after 90 days
}

# Lambda Configuration (Smaller for dev)
lambda_config = {
  runtime       = "python3.9"
  memory_size   = 256       # Smaller memory for dev
  timeout       = 180       # 3 minutes max
  log_retention = 3         # 3 days log retention
}

# ECS Configuration (Smaller for dev)
ecs_config = {
  cpu           = "1024"    # 1 vCPU
  memory        = "2048"    # 2GB RAM
  log_retention = 3         # 3 days log retention
}

# API Gateway Configuration
api_gateway_config = {
  throttle_rate_limit  = 50    # Lower limit for dev
  throttle_burst_limit = 100   # Lower burst capacity
  endpoint_type        = "REGIONAL"
}

# CloudFront Configuration
cloudfront_config = {
  price_class = "PriceClass_100"  # US, Canada, Europe only
  default_ttl = 300               # 5 minutes
  max_ttl     = 3600              # 1 hour
  compress    = true
}

# Cognito Configuration
cognito_config = {
  mfa_configuration = "OFF"  # Disabled for dev
  password_policy = {
    minimum_length    = 6    # Simpler for dev
    require_lowercase = true
    require_numbers   = false
    require_symbols   = false
    require_uppercase = false
  }
}

# Monitoring Configuration
monitoring_config = {
  log_retention_days = 3
  metric_filters     = ["ERROR", "TIMEOUT"]
  alarm_threshold    = 10
}

# Cost Optimization
cost_optimization = {
  enable_lifecycle_policies = true
  enable_intelligent_tiering = false  # Disable for dev
  reserved_capacity         = false
  spot_instances           = false
}

# Security Configuration (Relaxed for dev)
security_config = {
  enable_waf            = false  # Disabled for dev
  enable_access_logs    = false  # Disabled for dev
  encryption_at_rest    = true
  encryption_in_transit = true
  enable_vpc_endpoints  = false
}

# Data Sources (Test/Sandbox endpoints)
data_sources = {
  lseg_api_endpoint      = "https://sandbox.api.lseg.com/v1"
  reuters_api_endpoint   = "https://sandbox.api.reuters.com/v1"
  bloomberg_api_endpoint = "https://sandbox.api.bloomberg.com/v1"
  economic_data_apis     = [
    "https://api.eia.gov/v2",  # No sandbox available
    "https://api.imf.org/v1",
    "https://api.worldbank.org/v2"
  ]
  weather_api_endpoint = "https://api.openweathermap.org/data/2.5"
}

# Analytics Configuration
analytics_config = {
  claude_api_endpoint = "https://api.anthropic.com/v1"
  analysis_schedule   = "cron(0 12 * * FRI *)"  # Weekly Friday noon for dev
  collection_schedule = "cron(0 10 * * MON,WED,FRI *)"  # 3x per week for dev
  enable_ml_features  = true
}

# Resource Tags
tags = {
  Project     = "NEXUS_ENA"
  Owner       = "DataEngineeringTeam"
  CostCenter  = "EnergyAnalytics"
  Environment = "dev"
  ManagedBy   = "Terraform"
  CostTarget  = "Under10USD"
  DataClass   = "Development"
}
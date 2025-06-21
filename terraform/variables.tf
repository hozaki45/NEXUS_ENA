variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
  
  validation {
    condition = contains([
      "us-east-1", "us-east-2", "us-west-1", "us-west-2",
      "eu-west-1", "eu-west-2", "eu-central-1", "ap-southeast-1"
    ], var.aws_region)
    error_message = "AWS region must be a valid region."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "claude_api_key" {
  description = "Claude API key for AI analysis"
  type        = string
  sensitive   = true
}

variable "lseg_api_key" {
  description = "LSEG (London Stock Exchange Group) API key"
  type        = string
  sensitive   = true
}

variable "reuters_api_key" {
  description = "Reuters API key for news and data"
  type        = string
  sensitive   = true
  default     = ""
}

variable "bloomberg_api_key" {
  description = "Bloomberg API key for financial data"
  type        = string
  sensitive   = true
  default     = ""
}

variable "weather_api_key" {
  description = "Weather API key for meteorological data"
  type        = string
  sensitive   = true
  default     = ""
}

variable "economic_api_key" {
  description = "Economic indicators API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cost_threshold" {
  description = "Monthly cost threshold in USD for alerts"
  type        = number
  default     = 18
  
  validation {
    condition     = var.cost_threshold > 0 && var.cost_threshold <= 25
    error_message = "Cost threshold must be between 1 and 25 USD."
  }
}

variable "data_retention_days" {
  description = "Number of days to retain raw data in S3 Standard"
  type        = number
  default     = 30
  
  validation {
    condition     = var.data_retention_days >= 7 && var.data_retention_days <= 90
    error_message = "Data retention must be between 7 and 90 days."
  }
}

variable "lambda_memory_size" {
  description = "Memory size for Lambda functions in MB"
  type        = number
  default     = 512
  
  validation {
    condition = contains([
      128, 256, 512, 1024, 1536, 2048, 3008
    ], var.lambda_memory_size)
    error_message = "Lambda memory size must be a valid option."
  }
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions in seconds"
  type        = number
  default     = 300
  
  validation {
    condition     = var.lambda_timeout >= 3 && var.lambda_timeout <= 900
    error_message = "Lambda timeout must be between 3 and 900 seconds."
  }
}

variable "ecs_cpu" {
  description = "CPU units for ECS Fargate tasks"
  type        = number
  default     = 256
  
  validation {
    condition = contains([
      256, 512, 1024, 2048, 4096
    ], var.ecs_cpu)
    error_message = "ECS CPU must be a valid Fargate option."
  }
}

variable "ecs_memory" {
  description = "Memory for ECS Fargate tasks in MB"
  type        = number
  default     = 512
  
  validation {
    condition = contains([
      512, 1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192
    ], var.ecs_memory)
    error_message = "ECS memory must be a valid Fargate option."
  }
}

variable "cloudwatch_log_retention" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
  
  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653
    ], var.cloudwatch_log_retention)
    error_message = "CloudWatch log retention must be a valid option."
  }
}

variable "enable_waf" {
  description = "Enable AWS WAF for API Gateway protection"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Enable AWS CloudTrail for audit logging"
  type        = bool
  default     = true
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC Flow Logs for network monitoring"
  type        = bool
  default     = false  # Cost optimization
}

variable "backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 35
  
  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 1 and 35 days."
  }
}

variable "enable_cross_region_backup" {
  description = "Enable cross-region backup for disaster recovery"
  type        = bool
  default     = false  # Cost optimization - enable for production
}

variable "backup_region" {
  description = "Secondary region for cross-region backups"
  type        = string
  default     = "us-west-2"
}

variable "notification_email" {
  description = "Email address for cost and operational alerts"
  type        = string
  default     = ""
  
  validation {
    condition = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.notification_email)) || var.notification_email == ""
    error_message = "Notification email must be a valid email address or empty."
  }
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Restrict in production
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring (additional cost)"
  type        = bool
  default     = false  # Cost optimization
}

variable "api_rate_limit" {
  description = "API Gateway rate limit (requests per minute)"
  type        = number
  default     = 100
  
  validation {
    condition     = var.api_rate_limit >= 10 && var.api_rate_limit <= 10000
    error_message = "API rate limit must be between 10 and 10,000 requests per minute."
  }
}

variable "api_burst_limit" {
  description = "API Gateway burst limit"
  type        = number
  default     = 200
  
  validation {
    condition     = var.api_burst_limit >= var.api_rate_limit
    error_message = "API burst limit must be greater than or equal to rate limit."
  }
}

variable "data_sources" {
  description = "Configuration for external data sources"
  type = map(object({
    enabled     = bool
    rate_limit  = number
    timeout     = number
  }))
  default = {
    lseg = {
      enabled    = true
      rate_limit = 100
      timeout    = 30
    }
    reuters = {
      enabled    = false
      rate_limit = 50
      timeout    = 30
    }
    bloomberg = {
      enabled    = false
      rate_limit = 50
      timeout    = 30
    }
    weather = {
      enabled    = true
      rate_limit = 1000
      timeout    = 10
    }
    economic = {
      enabled    = true
      rate_limit = 100
      timeout    = 30
    }
  }
}

variable "analysis_schedule" {
  description = "Cron expression for weekly analysis schedule"
  type        = string
  default     = "cron(0 2 ? * SUN *)"  # Every Sunday at 2 AM UTC
  
  validation {
    condition     = can(regex("^cron\\(", var.analysis_schedule))
    error_message = "Analysis schedule must be a valid cron expression."
  }
}

variable "collection_schedule" {
  description = "Cron expression for daily data collection schedule"
  type        = string
  default     = "cron(0 6 * * ? *)"  # Every day at 6 AM UTC
  
  validation {
    condition     = can(regex("^cron\\(", var.collection_schedule))
    error_message = "Collection schedule must be a valid cron expression."
  }
}

variable "enable_spot_pricing" {
  description = "Use Spot pricing for ECS tasks (cost optimization, less reliability)"
  type        = bool
  default     = false
}

variable "database_backup_window" {
  description = "Preferred backup window for DynamoDB (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket  = "nexus-ena-terraform-state"
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "NEXUS_ENA"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "EnergyAnalytics"
      Owner       = "Architecture Team"
    }
  }
}

# Data Variables
locals {
  app_name = "nexus-ena"
  common_tags = {
    Application = local.app_name
    Environment = var.environment
  }
}

# S3 Buckets
resource "aws_s3_bucket" "data_lake" {
  bucket = "${local.app_name}-data-lake-${var.environment}"
}

resource "aws_s3_bucket_versioning" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "data_lake" {
  bucket = aws_s3_bucket.data_lake.id
  rule {
    id     = "data_lifecycle"
    status = "Enabled"
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
    
    expiration {
      days = 2555  # 7 years retention
    }
    
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_s3_bucket" "web_hosting" {
  bucket = "${local.app_name}-web-${var.environment}"
}

resource "aws_s3_bucket_website_configuration" "web_hosting" {
  bucket = aws_s3_bucket.web_hosting.id
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "error.html"
  }
}

# DynamoDB for metadata
resource "aws_dynamodb_table" "metadata" {
  name           = "${local.app_name}-metadata-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "data_source"
  range_key      = "timestamp"
  
  attribute {
    name = "data_source"
    type = "S"
  }
  
  attribute {
    name = "timestamp"
    type = "S"
  }
  
  point_in_time_recovery {
    enabled = true
  }
  
  server_side_encryption {
    enabled = true
  }
  
  tags = local.common_tags
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${local.app_name}-lambda-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "${local.app_name}-lambda-policy-${var.environment}"
  role = aws_iam_role.lambda_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.data_lake.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.metadata.arn
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${local.app_name}/*"
      }
    ]
  })
}

# Lambda Function for Data Collection
resource "aws_lambda_function" "data_collector" {
  filename         = "data_collector.zip"
  function_name    = "${local.app_name}-data-collector-${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "lambda_function.lambda_handler"
  runtime         = "python3.9"
  timeout         = 300
  memory_size     = 512
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      S3_BUCKET   = aws_s3_bucket.data_lake.bucket
      DYNAMODB_TABLE = aws_dynamodb_table.metadata.name
    }
  }
  
  depends_on = [aws_iam_role_policy.lambda_policy]
  tags       = local.common_tags
}

# EventBridge Rule for Daily Execution
resource "aws_cloudwatch_event_rule" "daily_collection" {
  name                = "${local.app_name}-daily-collection-${var.environment}"
  description         = "Trigger data collection daily at 6 AM UTC"
  schedule_expression = "cron(0 6 * * ? *)"
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.daily_collection.name
  target_id = "DataCollectorTarget"
  arn       = aws_lambda_function.data_collector.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.data_collector.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_collection.arn
}

# ECS Cluster for Analysis
resource "aws_ecs_cluster" "analysis_cluster" {
  name = "${local.app_name}-analysis-${var.environment}"
  
  setting {
    name  = "containerInsights"
    value = "disabled"  # Cost optimization
  }
  
  tags = local.common_tags
}

# ECS Task Definition
resource "aws_ecs_task_definition" "analysis_task" {
  family                   = "${local.app_name}-analysis-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn
  
  container_definitions = jsonencode([
    {
      name  = "analysis-container"
      image = "${aws_ecr_repository.analysis_repo.repository_url}:latest"
      
      environment = [
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "S3_BUCKET"
          value = aws_s3_bucket.data_lake.bucket
        },
        {
          name  = "DYNAMODB_TABLE"
          value = aws_dynamodb_table.metadata.name
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs_logs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

# ECR Repository
resource "aws_ecr_repository" "analysis_repo" {
  name                 = "${local.app_name}-analysis"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  tags = local.common_tags
}

# ECS IAM Roles
resource "aws_iam_role" "ecs_execution_role" {
  name = "${local.app_name}-ecs-execution-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${local.app_name}-ecs-task-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "${local.app_name}-ecs-task-policy-${var.environment}"
  role = aws_iam_role.ecs_task_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.data_lake.arn,
          "${aws_s3_bucket.data_lake.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.metadata.arn
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${local.app_name}/*"
      }
    ]
  })
}

# CloudWatch Log Group for ECS
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/${local.app_name}-analysis-${var.environment}"
  retention_in_days = 14  # Cost optimization
  
  tags = local.common_tags
}

# EventBridge Rule for Weekly Analysis
resource "aws_cloudwatch_event_rule" "weekly_analysis" {
  name                = "${local.app_name}-weekly-analysis-${var.environment}"
  description         = "Trigger weekly analysis every Sunday at 2 AM UTC"
  schedule_expression = "cron(0 2 ? * SUN *)"
}

resource "aws_cloudwatch_event_target" "ecs_target" {
  rule      = aws_cloudwatch_event_rule.weekly_analysis.name
  target_id = "WeeklyAnalysisTarget"
  arn       = aws_ecs_cluster.analysis_cluster.arn
  role_arn  = aws_iam_role.eventbridge_ecs_role.arn
  
  ecs_target {
    task_definition_arn = aws_ecs_task_definition.analysis_task.arn
    launch_type         = "FARGATE"
    platform_version    = "LATEST"
    
    network_configuration {
      subnets          = data.aws_subnets.default.ids
      security_groups  = [aws_security_group.ecs_tasks.id]
      assign_public_ip = true
    }
  }
}

# EventBridge ECS Role
resource "aws_iam_role" "eventbridge_ecs_role" {
  name = "${local.app_name}-eventbridge-ecs-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "eventbridge_ecs_policy" {
  name = "${local.app_name}-eventbridge-ecs-policy-${var.environment}"
  role = aws_iam_role.eventbridge_ecs_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:RunTask"
        ]
        Resource = aws_ecs_task_definition.analysis_task.arn
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          aws_iam_role.ecs_execution_role.arn,
          aws_iam_role.ecs_task_role.arn
        ]
      }
    ]
  })
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${local.app_name}-ecs-tasks-${var.environment}"
  vpc_id      = data.aws_vpc.default.id
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = local.common_tags
}

# Data sources for default VPC
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "web_distribution" {
  origin {
    domain_name = aws_s3_bucket.web_hosting.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.web_hosting.bucket}"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.web_oai.cloudfront_access_identity_path
    }
  }
  
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.web_hosting.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
  
  tags = local.common_tags
}

resource "aws_cloudfront_origin_access_identity" "web_oai" {
  comment = "OAI for ${local.app_name} web hosting"
}

# S3 Bucket Policy for CloudFront
resource "aws_s3_bucket_policy" "web_hosting_policy" {
  bucket = aws_s3_bucket.web_hosting.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.web_oai.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.web_hosting.arn}/*"
      }
    ]
  })
}

# Cognito User Pool
resource "aws_cognito_user_pool" "users" {
  name = "${local.app_name}-users-${var.environment}"
  
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }
  
  auto_verified_attributes = ["email"]
  
  tags = local.common_tags
}

resource "aws_cognito_user_pool_client" "web_client" {
  name         = "${local.app_name}-web-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.users.id
  
  generate_secret = false
  
  supported_identity_providers = ["COGNITO"]
  
  callback_urls = [
    "https://${aws_cloudfront_distribution.web_distribution.domain_name}/callback"
  ]
  
  logout_urls = [
    "https://${aws_cloudfront_distribution.web_distribution.domain_name}/logout"
  ]
  
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                = ["email", "openid", "profile"]
  allowed_oauth_flows_user_pool_client = true
}

# API Gateway
resource "aws_api_gateway_rest_api" "api" {
  name        = "${local.app_name}-api-${var.environment}"
  description = "NEXUS ENA API Gateway"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
  
  tags = local.common_tags
}

# CloudWatch Alarms for Cost Monitoring
resource "aws_cloudwatch_metric_alarm" "cost_alarm" {
  alarm_name          = "${local.app_name}-cost-alarm-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "86400"
  statistic           = "Maximum"
  threshold           = "18"
  alarm_description   = "This alarm monitors AWS estimated charges"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]
  
  dimensions = {
    Currency = "USD"
  }
}

resource "aws_sns_topic" "cost_alerts" {
  name = "${local.app_name}-cost-alerts-${var.environment}"
  tags = local.common_tags
}

# Systems Manager Parameters for API Keys
resource "aws_ssm_parameter" "claude_api_key" {
  name  = "/${local.app_name}/claude-api-key"
  type  = "SecureString"
  value = var.claude_api_key
  
  tags = local.common_tags
}

resource "aws_ssm_parameter" "lseg_api_key" {
  name  = "/${local.app_name}/lseg-api-key"
  type  = "SecureString"
  value = var.lseg_api_key
  
  tags = local.common_tags
}
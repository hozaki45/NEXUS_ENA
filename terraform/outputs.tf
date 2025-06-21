output "s3_data_lake_bucket" {
  description = "Name of the S3 data lake bucket"
  value       = aws_s3_bucket.data_lake.bucket
}

output "s3_web_hosting_bucket" {
  description = "Name of the S3 web hosting bucket"
  value       = aws_s3_bucket.web_hosting.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.web_distribution.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.web_distribution.domain_name
}

output "api_gateway_url" {
  description = "API Gateway base URL"
  value       = "https://${aws_api_gateway_rest_api.api.id}.execute-api.${var.aws_region}.amazonaws.com"
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.users.id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.web_client.id
  sensitive   = true
}

output "lambda_function_name" {
  description = "Name of the data collection Lambda function"
  value       = aws_lambda_function.data_collector.function_name
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.analysis_cluster.name
}

output "ecs_task_definition_arn" {
  description = "ARN of the ECS task definition"
  value       = aws_ecs_task_definition.analysis_task.arn
}

output "ecr_repository_url" {
  description = "ECR repository URL for the analysis container"
  value       = aws_ecr_repository.analysis_repo.repository_url
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB metadata table"
  value       = aws_dynamodb_table.metadata.name
}

output "sns_cost_alerts_topic_arn" {
  description = "ARN of the SNS topic for cost alerts"
  value       = aws_sns_topic.cost_alerts.arn
}

output "cloudwatch_cost_alarm_name" {
  description = "Name of the CloudWatch cost monitoring alarm"
  value       = aws_cloudwatch_metric_alarm.cost_alarm.alarm_name
}

output "iam_lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_role.arn
}

output "iam_ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task_role.arn
}

output "iam_ecs_execution_role_arn" {
  description = "ARN of the ECS execution role"
  value       = aws_iam_role.ecs_execution_role.arn
}

output "security_group_ecs_tasks_id" {
  description = "ID of the security group for ECS tasks"
  value       = aws_security_group.ecs_tasks.id
}

output "eventbridge_daily_rule_name" {
  description = "Name of the EventBridge rule for daily data collection"
  value       = aws_cloudwatch_event_rule.daily_collection.name
}

output "eventbridge_weekly_rule_name" {
  description = "Name of the EventBridge rule for weekly analysis"
  value       = aws_cloudwatch_event_rule.weekly_analysis.name
}

output "cloudwatch_ecs_log_group_name" {
  description = "Name of the CloudWatch log group for ECS tasks"
  value       = aws_cloudwatch_log_group.ecs_logs.name
}

output "ssm_parameter_claude_api_key" {
  description = "SSM parameter name for Claude API key"
  value       = aws_ssm_parameter.claude_api_key.name
  sensitive   = true
}

output "ssm_parameter_lseg_api_key" {
  description = "SSM parameter name for LSEG API key"
  value       = aws_ssm_parameter.lseg_api_key.name
  sensitive   = true
}

# Deployment Information
output "deployment_info" {
  description = "Complete deployment information for operations team"
  value = {
    infrastructure = {
      region                = var.aws_region
      environment          = var.environment
      s3_data_bucket       = aws_s3_bucket.data_lake.bucket
      s3_web_bucket        = aws_s3_bucket.web_hosting.bucket
      dynamodb_table       = aws_dynamodb_table.metadata.name
      lambda_function      = aws_lambda_function.data_collector.function_name
      ecs_cluster          = aws_ecs_cluster.analysis_cluster.name
      ecr_repository       = aws_ecr_repository.analysis_repo.repository_url
    }
    endpoints = {
      website_url          = "https://${aws_cloudfront_distribution.web_distribution.domain_name}"
      api_gateway_url      = "https://${aws_api_gateway_rest_api.api.id}.execute-api.${var.aws_region}.amazonaws.com"
      cloudfront_domain    = aws_cloudfront_distribution.web_distribution.domain_name
    }
    authentication = {
      cognito_user_pool_id     = aws_cognito_user_pool.users.id
      cognito_client_id        = aws_cognito_user_pool_client.web_client.id
      cognito_domain          = "${aws_cognito_user_pool.users.name}.auth.${var.aws_region}.amazoncognito.com"
    }
    monitoring = {
      cost_alarm              = aws_cloudwatch_metric_alarm.cost_alarm.alarm_name
      sns_topic               = aws_sns_topic.cost_alerts.arn
      ecs_log_group          = aws_cloudwatch_log_group.ecs_logs.name
    }
    scheduling = {
      daily_collection_rule   = aws_cloudwatch_event_rule.daily_collection.name
      weekly_analysis_rule    = aws_cloudwatch_event_rule.weekly_analysis.name
      collection_schedule     = var.collection_schedule
      analysis_schedule       = var.analysis_schedule
    }
  }
  sensitive = true
}

# Resource ARNs for cross-referencing
output "resource_arns" {
  description = "ARNs of all major resources"
  value = {
    s3_data_lake_arn         = aws_s3_bucket.data_lake.arn
    s3_web_hosting_arn       = aws_s3_bucket.web_hosting.arn
    dynamodb_table_arn       = aws_dynamodb_table.metadata.arn
    lambda_function_arn      = aws_lambda_function.data_collector.arn
    ecs_cluster_arn          = aws_ecs_cluster.analysis_cluster.arn
    ecs_task_definition_arn  = aws_ecs_task_definition.analysis_task.arn
    api_gateway_arn          = aws_api_gateway_rest_api.api.arn
    cognito_user_pool_arn    = aws_cognito_user_pool.users.arn
    cloudfront_arn           = aws_cloudfront_distribution.web_distribution.arn
    sns_topic_arn            = aws_sns_topic.cost_alerts.arn
  }
}

# Cost optimization insights
output "cost_optimization_info" {
  description = "Information for cost optimization and monitoring"
  value = {
    estimated_monthly_cost   = "Under $20 USD based on configuration"
    cost_drivers = [
      "Lambda executions: ~$2-3/month",
      "ECS Fargate: ~$3-5/month",
      "S3 storage: ~$2-4/month",
      "DynamoDB: ~$1-2/month",
      "CloudFront: ~$1/month",
      "Data transfer: ~$1-2/month",
      "Other services: ~$3-5/month"
    ]
    cost_optimization_features = [
      "S3 lifecycle policies (Standard → IA → Glacier → Deep Archive)",
      "DynamoDB on-demand pricing",
      "Lambda right-sizing (512MB memory)",
      "ECS Fargate minimal resources (0.25 vCPU, 0.5GB RAM)",
      "CloudWatch log retention (14 days)",
      "Spot pricing capability for ECS (disabled by default)",
      "Cost monitoring alarm at $18/month threshold"
    ]
    monitoring_recommendations = [
      "Monitor cost alarm daily",
      "Review AWS Cost Explorer weekly", 
      "Optimize S3 storage classes monthly",
      "Review Lambda execution patterns",
      "Monitor data transfer costs"
    ]
  }
}

# Security configuration summary
output "security_configuration" {
  description = "Security configuration summary"  
  value = {
    encryption = {
      s3_encryption           = "AES-256"
      dynamodb_encryption     = "AWS KMS"
      ssm_parameters         = "SecureString"
      cloudfront_https       = "Redirect to HTTPS"
    }
    access_control = {
      iam_least_privilege    = "Enabled"
      s3_bucket_policies     = "Configured"
      api_gateway_auth       = "Cognito JWT"
      cognito_password_policy = "Strong (8+ chars, mixed case, numbers)"
    }
    network_security = {
      vpc_security_groups    = "Configured for ECS"
      cloudfront_oai         = "Enabled"
      api_gateway_regional   = "Enabled"
    }
    monitoring = {
      cloudtrail_enabled     = var.enable_cloudtrail
      waf_enabled           = var.enable_waf
      cost_monitoring       = "Enabled"
      log_retention         = "${var.cloudwatch_log_retention} days"
    }
  }
}
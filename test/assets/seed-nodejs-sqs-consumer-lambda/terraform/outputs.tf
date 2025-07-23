output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.seed_nodejs_sqs_consumer_lambda.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.seed_nodejs_sqs_consumer_lambda.arn
}

output "sqs_queue_arn" {
  description = "ARN of the SQS queue"
  value       = aws_sqs_queue.seed_nodejs_sqs_consumer_lambda.arn
}

output "ssm_parameter_name" {
  description = "Name of the SSM parameter storing the SNS topic ARN"
  value       = aws_ssm_parameter.seed_nodejs_sqs_consumer_lambda_topic_arn.name
} 
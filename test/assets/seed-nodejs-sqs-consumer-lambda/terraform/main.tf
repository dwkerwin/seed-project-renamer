# SNS Topic with KMS encryption
resource "aws_sns_topic" "seed_nodejs_sqs_consumer_lambda" {
  name              = "seed-nodejs-sqs-consumer-lambda-topic"
  kms_master_key_id = "alias/example-data-key"

  # Only configure delivery logging if enabled
  sqs_success_feedback_role_arn    = var.enable_sns_delivery_logging ? aws_iam_role.sns_delivery_status[0].arn : null
  sqs_success_feedback_sample_rate = var.enable_sns_delivery_logging ? 100 : null
  sqs_failure_feedback_role_arn    = var.enable_sns_delivery_logging ? aws_iam_role.sns_delivery_status[0].arn : null
}

# SSM Parameter for SNS Topic ARN
resource "aws_ssm_parameter" "seed_nodejs_sqs_consumer_lambda_topic_arn" {
  name  = "/example-org/exports/seed-nodejs-sqs-consumer-lambda-topic-arn"
  type  = "String"
  value = aws_sns_topic.seed_nodejs_sqs_consumer_lambda.arn
}

# SQS Queue with KMS encryption
resource "aws_sqs_queue" "seed_nodejs_sqs_consumer_lambda" {
  name                       = "seed-nodejs-sqs-consumer-lambda-queue"
  visibility_timeout_seconds = 300  # 5 minutes
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 20  # Enable long polling
  kms_master_key_id         = "alias/example-data-key"

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.seed_nodejs_sqs_consumer_lambda_dlq.arn
    maxReceiveCount     = 3
  })
}

# DLQ for the main queue
resource "aws_sqs_queue" "seed_nodejs_sqs_consumer_lambda_dlq" {
  name              = "seed-nodejs-sqs-consumer-lambda-dlq"
  kms_master_key_id = "alias/example-data-key"
}

# Subscribe SQS to SNS
# Security model:
# 1. SNS -> SQS message delivery is authorized by the SQS queue policy below
# 2. SNS -> KMS encryption is authorized by the KMS key policy (in a separate terraform config)
# 3. SQS -> KMS decryption is authorized by the KMS key policy
resource "aws_sns_topic_subscription" "seed_nodejs_sqs_consumer_lambda" {
  topic_arn = aws_sns_topic.seed_nodejs_sqs_consumer_lambda.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.seed_nodejs_sqs_consumer_lambda.arn
}

# SQS Queue Policy - allows SNS to send messages to this queue
resource "aws_sqs_queue_policy" "seed_nodejs_sqs_consumer_lambda" {
  queue_url = aws_sqs_queue.seed_nodejs_sqs_consumer_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.seed_nodejs_sqs_consumer_lambda.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn": aws_sns_topic.seed_nodejs_sqs_consumer_lambda.arn
          }
        }
      }
    ]
  })
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "seed_nodejs_sqs_consumer_lambda" {
  name              = "/aws/lambda/seed-nodejs-sqs-consumer-lambda"
  retention_in_days = 14
}

# Lambda Function
resource "aws_lambda_function" "seed_nodejs_sqs_consumer_lambda" {
  function_name = "seed-nodejs-sqs-consumer-lambda"
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.lambda.repository_url}:${var.image_tag}"
  role          = aws_iam_role.lambda_execution.arn
  timeout       = 300  # 5 minutes
  architectures = ["arm64"]
  memory_size   = 256

  vpc_config {
    subnet_ids         = var.private_subnets
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      # AWS_REGION is reserved and automatically set by Lambda
      AWS_ENV              = var.aws_env
      LOG_LEVEL            = var.log_level
      SSM_PARAMETER_KMS_KEY = "alias/example-ssm-key"
      SQS_QUEUE_NAME       = aws_sqs_queue.seed_nodejs_sqs_consumer_lambda.name
    }
  }
}

# Event source mapping - connects SQS queue to Lambda function
resource "aws_lambda_event_source_mapping" "seed_nodejs_sqs_consumer_lambda" {
  event_source_arn = aws_sqs_queue.seed_nodejs_sqs_consumer_lambda.arn
  function_name    = aws_lambda_function.seed_nodejs_sqs_consumer_lambda.arn
  
  # Number of messages each Lambda invocation will process
  batch_size       = 1

  scaling_config {
    # Maximum number of concurrent Lambda invocations
    # With batch_size = 1 and maximum_concurrency = 5,
    # up to 5 messages can be processed simultaneously
    maximum_concurrency = var.max_concurrency
  }
}

# Lambda IAM Role
resource "aws_iam_role" "lambda_execution" {
  name = "seed-nodejs-sqs-consumer-lambda-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
      {
        Effect = "Allow",
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/deployment-user"
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Lambda basic execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda SQS policy
resource "aws_iam_role_policy_attachment" "lambda_sqs" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
}

# Lambda VPC access policy
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Lambda S3 and KMS policy
resource "aws_iam_role_policy" "lambda_seed_nodejs_sqs_consumer_lambda" {
  name = "seed-nodejs-sqs-consumer-lambda-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [
          "arn:aws:kms:${var.region}:${data.aws_caller_identity.current.account_id}:key/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/*"
        ]
      }
    ]
  })
}

# SNS Delivery Status Logging Role (only created if logging is enabled)
resource "aws_iam_role" "sns_delivery_status" {
  count = var.enable_sns_delivery_logging ? 1 : 0
  name  = "seed-nodejs-sqs-consumer-lambda-sns-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
      }
    ]
  })
}

# SNS Delivery Status Logging Policy
resource "aws_iam_role_policy" "sns_delivery_status" {
  count = var.enable_sns_delivery_logging ? 1 : 0
  name  = "seed-nodejs-sqs-consumer-lambda-sns-policy"
  role  = aws_iam_role.sns_delivery_status[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:PutMetricFilter",
          "logs:PutRetentionPolicy"
        ]
        Resource = [
          "*"
        ]
      }
    ]
  })
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Security Group for Lambda
resource "aws_security_group" "lambda_sg" {
  name        = "seed-nodejs-sqs-consumer-lambda-sg"
  description = "Security group for Lambda function"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "seed-nodejs-sqs-consumer-lambda-sg"
  }
} 
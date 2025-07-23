variable "aws_env" {
  description = "AWS Environment name (e.g., dev, prod)"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "image_name" {
  description = "Name of the Docker image, e.g. example-org/myservice"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "max_concurrency" {
  description = "Maximum number of concurrent Lambda invocations when processing SQS messages"
  type        = number
  default     = 5
}

variable "enable_sns_delivery_logging" {
  description = "Whether to enable SNS delivery status logging to CloudWatch"
  type        = bool
  default     = false
}

variable "log_level" {
  description = "Log level for the Lambda function (debug, info, warn, error)"
  type        = string
  default     = "info"
}

variable "ecr_image_lifecycle_count" {
  description = "Number of images to retain in ECR repository per environment"
  type        = number
  default     = 5 # Development only
}

variable "vpc_id" {
  description = "ID of the VPC where Lambda function will run"
  type        = string
}

variable "private_subnets" {
  description = "List of private subnet IDs where Lambda function will run"
  type        = list(string)
}

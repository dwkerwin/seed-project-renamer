data "aws_caller_identity" "current" {}

variable "aws_primary_region" {
  type = string
}

variable "aws_account_id" {
  type = string
}

variable "aws_env" {
  type = string
}

variable "image_tag" {
  default = "latest"
}

variable "vpc_id" {
  type = string
}

variable "private_subnets" {
  type = list(string)
  description = "List of IDs for private subnets"
}

variable "env_suffix" {
  type = string
  description = "Suffix for the environment name"
}

variable "container_cpu" {
  type        = number
  description = "CPU units for the container (1 vCPU = 1024 units)"
  default     = 512
}

variable "container_memory" {
  type        = number
  description = "Memory for the container in MiB"
  default     = 1024
}

variable "min_containers" {
  type        = number
  description = "Minimum number of containers to run"
  default     = 1
}

variable "ecs_cluster_name" {
  type        = string
  description = "Name of the ECS cluster"
}

variable "subdomain" {
  type        = string
  description = "Subdomain for the service"
}

variable "log_level" {
  type        = string
  description = "Log level for the service"
  default     = "info"
}

data "terraform_remote_state" "encryption_resources" {
  backend = "s3"
  config = {
    bucket = "yourorg-tfstate-${var.aws_env}"
    key    = "encryption-resources/terraform.tfstate"
    region = "us-east-1"
  }
}

# IAM Roles and Policies

# Grants ECS permissions to pull images and retrieve secrets for task setup
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "seed-dotnet-restapi-ecsfargate-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Create policy for SSM parameter access
resource "aws_iam_policy" "task_execution_policy" {
  name        = "seed-dotnet-restapi-ecsfargate-task-execution-policy"
  description = "Policy to allow access to SSM parameters"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_primary_region}:${var.aws_account_id}:parameter/yourorg/seed-dotnet-restapi-ecsfargate/*"
        ]
      }
    ]
  })
}

# Attach the SSM policy to the execution role
resource "aws_iam_role_policy_attachment" "task_execution_policy_attachment" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.task_execution_policy.arn
}

# Attach the ECS task execution policy
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allows the container to access AWS resources during runtime
resource "aws_iam_role" "ecs_task_role" {
  name = "seed-dotnet-restapi-ecsfargate-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}
	
# Create an IAM policy that allows access to the KMS key
resource "aws_iam_policy" "ecs_task_policy" {
  name        = "seed-dotnet-restapi-ecsfargate-ecs-task-policy"
  description = "Policy to allow ECS task access to KMS key"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = data.terraform_remote_state.encryption_resources.outputs.app_data_kms_key_arn
      }
    ]
  })
}

# Attach the KMS access policy to the IAM role
resource "aws_iam_role_policy_attachment" "attach_ecs_task_policy" {
  policy_arn = aws_iam_policy.ecs_task_policy.arn
  role       = aws_iam_role.ecs_task_role.name
}

# ECS Task Definition
resource "aws_ecs_task_definition" "seed_dotnet_restapi_ecsfargate" {
  family                   = "seed-dotnet-restapi-ecsfargate"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.container_cpu
  memory                   = var.container_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "seed-dotnet-restapi-ecsfargate"
      image     = "${aws_ecr_repository.seed_dotnet_restapi_ecsfargate.repository_url}:${var.image_tag}"
      cpu       = var.container_cpu
      memory    = var.container_memory
      essential = true
      
      environment = [
        # misc
        { name = "LOG_LEVEL", value = var.log_level },
        { name = "AWS_ENV", value = var.aws_env },
      ],

      portMappings = [
        {
          containerPort = 8081
          hostPort      = 8081
          protocol      = "tcp"
        },
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.seed_dotnet_restapi_ecsfargate.name
          awslogs-region        = var.aws_primary_region
          awslogs-stream-prefix = "seed-dotnet-restapi-ecsfargate"
        }
      }
    }
  ])
}

# ECS Service
resource "aws_ecs_service" "seed_dotnet_restapi_ecsfargate" {
  name            = "seed-dotnet-restapi-ecsfargate"
  cluster         = var.ecs_cluster_name
  task_definition = aws_ecs_task_definition.seed_dotnet_restapi_ecsfargate.arn
  desired_count   = var.min_containers
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnets
    assign_public_ip = false
    security_groups  = [aws_security_group.seed_dotnet_restapi_ecsfargate.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.seed_dotnet_restapi_ecsfargate.arn
    container_name   = "seed-dotnet-restapi-ecsfargate"
    container_port   = 8081
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "seed_dotnet_restapi_ecsfargate" {
  name              = "/ecs/seed-dotnet-restapi-ecsfargate"
  retention_in_days = 30
}

# Security Group
resource "aws_security_group" "seed_dotnet_restapi_ecsfargate" {
  name        = "seed-dotnet-restapi-ecsfargate-sg"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 8081
    to_port         = 8081
    protocol        = "tcp"
    security_groups = [data.terraform_remote_state.infrastructure.outputs.alb_sg_id]
  }

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [data.terraform_remote_state.infrastructure.outputs.alb_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ALB Target Group
resource "aws_lb_target_group" "seed_dotnet_restapi_ecsfargate" {
  name        = "seed-dotnet-restapi-tg" # name must be within 32 characters
  port        = 8081
  protocol    = "HTTPS"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/health"
    healthy_threshold   = 2
    unhealthy_threshold = 10
    timeout             = 30
    interval            = 60
    protocol            = "HTTPS"
    port                = "8081"
  }
}

# Create a deterministic priority based on service name
locals {
  # Create a consistent priority from the service name hash
  service_priority_base = parseint(substr(sha256("seed-dotnet-restapi-ecsfargate"), 0, 10), 16)
  # Map it to valid ALB priority range (1-50000), leaving room at the beginning
  # Using modulo to get a reasonable spread across the range
  service_priority = (local.service_priority_base % 48000) + 1000
}

# ALB Listener Rule
resource "aws_lb_listener_rule" "seed_dotnet_restapi_ecsfargate" {
  listener_arn = data.terraform_remote_state.infrastructure.outputs.alb_https_listener_arn
  priority     = local.service_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.seed_dotnet_restapi_ecsfargate.arn
  }

  condition {
    host_header {
      values = ["${var.subdomain}.aws-${var.aws_env}.yourorg.com"]
    }
  }
}

# Route 53 Record
resource "aws_route53_record" "seed_dotnet_restapi_ecsfargate" {
  zone_id = data.terraform_remote_state.infrastructure.outputs.aws_env_subdomain_zone_id
  name    = "${var.subdomain}.aws-${var.aws_env}.yourorg.com"
  type    = "A"

  alias {
    name                   = data.terraform_remote_state.infrastructure.outputs.alb_dns_name
    zone_id                = data.terraform_remote_state.infrastructure.outputs.alb_zone_id
    evaluate_target_health = false
  }
}

# Data source for existing infrastructure
data "terraform_remote_state" "infrastructure" {
  backend = "s3"
  config = {
    bucket = "yourorg-tfstate-${var.aws_env}"
    key    = "api-alb/terraform.tfstate"
    region = var.aws_primary_region
  }
}

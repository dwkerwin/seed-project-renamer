# Create ECR repository
resource "aws_ecr_repository" "seed_dotnet_restapi_ecsfargate" {
  name = "yourorg/seed-dotnet-restapi-ecsfargate"
}

# ECR lifecycle policy
resource "aws_ecr_lifecycle_policy" "seed_dotnet_restapi_ecsfargate" {
  repository = aws_ecr_repository.seed_dotnet_restapi_ecsfargate.name

  # This condition ensures the policy is only created in dev environment
  count = var.aws_env == "dev" ? 1 : 0
  
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Protect images with 'active' tag"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["active"]
          countType     = "imageCountMoreThan"
          countNumber   = 999999  # Set this extremely high so it never triggers
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep only the most recent images (regardless of tag status)"
        selection = {
          tagStatus   = "any"  # This matches both tagged and untagged images
          countType   = "imageCountMoreThan"
          countNumber = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

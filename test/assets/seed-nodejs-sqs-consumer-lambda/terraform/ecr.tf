resource "aws_ecr_repository" "lambda" {
  name = "${var.image_name}"
}

resource "aws_ecr_lifecycle_policy" "lambda" {
  # This condition ensures the policy is only created in dev environment
  count = var.aws_env == "dev" ? 1 : 0
  
  repository = aws_ecr_repository.lambda.name

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
          countNumber = var.ecr_image_lifecycle_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

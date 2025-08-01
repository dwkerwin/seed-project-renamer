provider "aws" {
  region  = "us-east-1"
}

terraform {
  backend "s3" {
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.77.0"
    }
  }
}

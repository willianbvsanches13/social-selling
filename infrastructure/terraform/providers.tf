# Terraform configuration for infrastructure management
# Social Selling Platform - Infrastructure as Code

terraform {
  required_version = ">= 1.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}

# Provider configuration
provider "local" {}

# Output current Terraform version
output "terraform_version" {
  description = "Terraform version used for this configuration"
  value       = "Terraform ${terraform.required_version}"
}

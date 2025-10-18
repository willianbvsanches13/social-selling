# VPS Configuration as Code
# Social Selling Platform - Server Specifications
#
# Note: Hostinger doesn't have a Terraform provider, so this configuration
# serves as documentation and Infrastructure as Code reference for the VPS specs

variable "vps_config" {
  description = "VPS configuration parameters for Hostinger KVM 2"
  type = object({
    provider     = string
    plan         = string
    vcpu         = number
    ram          = string
    storage      = string
    os           = string
    region       = string
    monthly_cost = string
  })

  default = {
    provider     = "Hostinger"
    plan         = "KVM 2"
    vcpu         = 2
    ram          = "4GB"
    storage      = "100GB SSD"
    os           = "Ubuntu 22.04 LTS"
    region       = "USA"
    monthly_cost = "$18-25"
  }
}

variable "network_config" {
  description = "Network configuration for the VPS"
  type = object({
    public_ip = string
    hostname  = string
    domain    = string
  })

  default = {
    public_ip = "82.197.93.247"
    hostname  = "social-selling-prod"
    domain    = "app-socialselling.willianbvsanches.com"
  }
}

variable "security_config" {
  description = "Security configuration for the VPS"
  type = object({
    ssh_port           = number
    password_auth      = bool
    root_login         = bool
    fail2ban_enabled   = bool
    firewall_enabled   = bool
    auto_updates       = bool
  })

  default = {
    ssh_port           = 22
    password_auth      = false
    root_login         = false
    fail2ban_enabled   = true
    firewall_enabled   = true
    auto_updates       = true
  }
}

variable "firewall_rules" {
  description = "UFW firewall rules configuration"
  type = list(object({
    port        = number
    protocol    = string
    source      = string
    description = string
  }))

  default = [
    {
      port        = 22
      protocol    = "tcp"
      source      = "any"
      description = "SSH"
    },
    {
      port        = 80
      protocol    = "tcp"
      source      = "any"
      description = "HTTP"
    },
    {
      port        = 443
      protocol    = "tcp"
      source      = "any"
      description = "HTTPS"
    }
  ]
}

# Outputs for documentation
output "vps_specifications" {
  description = "Complete VPS specifications"
  value = {
    server = var.vps_config
    network = var.network_config
    security = var.security_config
  }
}

output "firewall_rules" {
  description = "Configured firewall rules"
  value = var.firewall_rules
}

output "server_summary" {
  description = "Human-readable server summary"
  value = <<-EOT
    Server: ${var.vps_config.plan} (${var.vps_config.provider})
    Resources: ${var.vps_config.vcpu} vCPU, ${var.vps_config.ram} RAM, ${var.vps_config.storage}
    OS: ${var.vps_config.os}
    IP: ${var.network_config.public_ip}
    Hostname: ${var.network_config.hostname}
    Domain: ${var.network_config.domain}
    Monthly Cost: ${var.vps_config.monthly_cost}
  EOT
}

output "security_summary" {
  description = "Security configuration summary"
  value = <<-EOT
    SSH Port: ${var.security_config.ssh_port}
    Password Authentication: ${var.security_config.password_auth ? "Enabled" : "Disabled"}
    Root Login: ${var.security_config.root_login ? "Enabled" : "Disabled"}
    fail2ban: ${var.security_config.fail2ban_enabled ? "Enabled" : "Disabled"}
    Firewall (UFW): ${var.security_config.firewall_enabled ? "Enabled" : "Disabled"}
    Automatic Updates: ${var.security_config.auto_updates ? "Enabled" : "Disabled"}
  EOT
}

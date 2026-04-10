variable "project_id" {
  description = "GCP project ID — must be supplied explicitly; no default to prevent accidental local applies against production"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run and regional resources — must be supplied explicitly; no default to prevent configuration drift"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy (typically the git commit SHA)"
  type        = string
  default     = "latest"
}

variable "domain" {
  description = "Apex domain for the UI (e.g. osrscalctool.com). Must match the domain registered in Cloudflare. Leave empty to use HTTP only with the load balancer IP."
  type        = string
  default     = ""
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for var.domain. Found in the Cloudflare dashboard under the domain's Overview tab. When set (together with var.domain), TLS is enabled using a Cloudflare Origin CA certificate, the DNS A record is managed by Terraform, and Cloud Armor restricts ingress to Cloudflare IP ranges only."
  type        = string
  default     = ""

  validation {
    condition     = var.cloudflare_zone_id == "" || var.domain != ""
    error_message = "domain must be set when cloudflare_zone_id is provided."
  }
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone:Read and DNS:Edit permissions for the zone. Required when cloudflare_zone_id is set. Pass via the TF_VAR_cloudflare_api_token environment variable or a CI/CD secret — never hard-code."
  type        = string
  sensitive   = true
  default     = ""

  validation {
    condition     = var.cloudflare_zone_id == "" || var.cloudflare_api_token != ""
    error_message = "cloudflare_api_token must be provided when cloudflare_zone_id is set."
  }
}

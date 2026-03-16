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
  description = "Custom domain for the UI (e.g. osrstool.example.com). When provided, a Google-managed SSL cert is provisioned and HTTPS is enabled on the load balancer. Leave empty to use HTTP only."
  type        = string
  default     = ""
}

variable "dns_zone_name" {
  description = "Cloud DNS managed zone name for var.domain. Defaults to the domain with dots replaced by dashes (e.g. osrscalctool-com), which is what Google Cloud Domains creates automatically. Only set this if your zone has a different name."
  type        = string
  default     = ""
}

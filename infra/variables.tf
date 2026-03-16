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
  description = "Apex domain for the UI (e.g. osrscalctool.com). Must be the registered root domain — not a subdomain — because the Cloud DNS zone and Google-managed SSL cert are provisioned for this exact name. Leave empty to use HTTP only with the load balancer IP."
  type        = string
  default     = ""
}

variable "dns_zone_name" {
  description = "Cloud DNS managed zone name for var.domain. Defaults to the apex domain with dots replaced by dashes (e.g. osrscalctool.com → osrscalctool-com), which is the name Google Cloud Domains creates automatically. Only set this if your zone has a different name."
  type        = string
  default     = ""
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "oldschoolrunescapetool"
}

variable "region" {
  description = "GCP region for Cloud Run and regional resources"
  type        = string
  default     = "us-central1"
}

variable "image_tag" {
  description = "Docker image tag to deploy (typically the git commit SHA)"
  type        = string
  default     = "latest"
}

variable "api_url" {
  description = "Internal URL of the osrs-api Cloud Run service (set via GitHub secret API_SERVICE_URL)"
  type        = string
}

variable "domain" {
  description = "Custom domain for the UI (e.g. osrstool.example.com). When provided, a Google-managed SSL cert is provisioned and HTTPS is enabled on the load balancer. Leave empty to use HTTP only."
  type        = string
  default     = ""
}

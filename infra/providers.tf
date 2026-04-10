provider "google" {
  project = var.project_id
  region  = var.region
}

# api_token may be empty when cloudflare_zone_id is not set — the provider
# initialises without auth in that case, and no authenticated resources are
# created so no API calls are made.
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

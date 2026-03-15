terraform {
  required_version = ">= 1.8.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    # Same state bucket as the API — separate prefix keeps workspaces isolated.
    # Bucket must exist before running `tofu init`.
    bucket = "oldschoolrunescapetool-tofu-state"
    prefix = "osrs-ui/state"
  }
}

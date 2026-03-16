locals {
  image = "us-central1-docker.pkg.dev/${var.project_id}/osrs-ui/osrs-ui:${var.image_tag}"

  # true when a custom domain is provided — enables managed SSL cert + HTTPS forwarding
  tls_enabled = var.domain != ""

  # Use the regional Cloud Run URL format (project-number.region.run.app) for
  # internal service-to-service calls — more reliable than the hash-based global URL.
  api_url = "https://osrs-api-${data.google_project.project.number}.${var.region}.run.app"
}

# ---------------------------------------------------------------------------
# Private VPC — used for Direct VPC Egress so the UI Cloud Run service
# reaches the API over Google's internal network rather than the public
# internet. This lets the API stay on INGRESS_TRAFFIC_INTERNAL_ONLY while
# still being reachable from the UI without a Serverless VPC Connector.
# ---------------------------------------------------------------------------

resource "google_compute_network" "private" {
  name                    = "osrs-private-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

# /24 subnet satisfies the minimum size required for Direct VPC Egress.
resource "google_compute_subnetwork" "ui" {
  name          = "osrs-ui-subnet"
  ip_cidr_range = "10.8.0.0/24"
  region        = var.region
  network       = google_compute_network.private.id
  project       = var.project_id
}

# Resolve the numeric project number so we can construct the regional API URL.
data "google_project" "project" {
  project_id = var.project_id
}

# ---------------------------------------------------------------------------
# Service account
# ---------------------------------------------------------------------------

resource "google_service_account" "ui" {
  account_id   = "osrs-ui-sa"
  display_name = "OSRS UI Cloud Run Service Account"
  project      = var.project_id
}

# ---------------------------------------------------------------------------
# IAM — grant the UI SA permission to invoke the internal API
# ---------------------------------------------------------------------------

# Reference the already-deployed API service so we can bind IAM without
# hard-coding resource IDs.
data "google_cloud_run_v2_service" "api" {
  name     = "osrs-api"
  location = var.region
  project  = var.project_id
}

resource "google_cloud_run_v2_service_iam_member" "ui_invokes_api" {
  project  = var.project_id
  location = var.region
  name     = data.google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.ui.email}"
}

# ---------------------------------------------------------------------------
# Cloud Run — UI service
# ---------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "ui" {
  name     = "osrs-ui"
  location = var.region
  project  = var.project_id

  # Block direct *.run.app access — all traffic must enter through the load
  # balancer so Cloud Armor is always in the path.
  ingress = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = google_service_account.ui.email

    # Route all outbound traffic through the private VPC so calls to the API
    # are treated as internal traffic. The metadata server (169.254.169.254)
    # is always accessible regardless of this setting.
    vpc_access {
      network_interfaces {
        network    = google_compute_network.private.name
        subnetwork = google_compute_subnetwork.ui.name
      }
      egress = "ALL_TRAFFIC"
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    containers {
      image = local.image

      ports {
        container_port = 8080
      }

      # API_URL is consumed by the OpenResty Lua BFF proxy in nginx.conf to
      # both fetch the correct audience identity token and route upstream calls.
      # Uses the regional URL format (project-number.region.run.app) which is
      # more reliable for internal Cloud Run to Cloud Run communication.
      env {
        name  = "API_URL"
        value = local.api_url
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }
    }
  }

  depends_on = [google_cloud_run_v2_service_iam_member.ui_invokes_api]
}

# Public access — authentication is handled by Cloud Armor at the LB layer,
# not by Cloud Run IAM.
resource "google_cloud_run_v2_service_iam_member" "ui_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.ui.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ---------------------------------------------------------------------------
# Cloud Armor security policy
# NOTE: preconfigured WAF rules and rate-limiting require Cloud Armor Standard
# (~$5/month + per-request fees). Remove the throttle and preconfigured rules
# to stay on the free tier.
# ---------------------------------------------------------------------------

resource "google_compute_security_policy" "ui" {
  name    = "osrs-ui-armor"
  project = var.project_id

  # Rate limiting — ban IPs that exceed 500 requests/minute for 60 seconds
  rule {
    priority    = 1000
    action      = "rate_based_ban"
    description = "Ban IPs exceeding 500 req/min for 60 s"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    rate_limit_options {
      rate_limit_threshold {
        count        = 500
        interval_sec = 60
      }
      ban_duration_sec   = 60
      conform_action     = "allow"
      exceed_action      = "deny(429)"
      enforce_on_key     = "IP"
    }
  }

  # OWASP core WAF rules — blocks XSS, SQLi, LFI, RFI, scanner probes
  rule {
    priority    = 2000
    action      = "deny(403)"
    description = "OWASP core WAF rules"

    match {
      expr {
        expression = join(" || ", [
          "evaluatePreconfiguredExpr('xss-v33-stable')",
          "evaluatePreconfiguredExpr('sqli-v33-stable')",
          "evaluatePreconfiguredExpr('lfi-v33-stable')",
          "evaluatePreconfiguredExpr('rfi-v33-stable')",
          "evaluatePreconfiguredExpr('scannerdetection-v33-stable')",
        ])
      }
    }
  }

  # Default allow
  rule {
    priority    = 2147483647
    action      = "allow"
    description = "Default allow"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}

# ---------------------------------------------------------------------------
# Global external HTTPS load balancer with Cloud Armor
# ---------------------------------------------------------------------------

# Static external IP — point your DNS A record here after the first apply.
resource "google_compute_global_address" "ui" {
  name    = "osrs-ui-ip"
  project = var.project_id
}

# Serverless NEG — maps the global LB backend to the regional Cloud Run service
resource "google_compute_region_network_endpoint_group" "ui" {
  name                  = "osrs-ui-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  project               = var.project_id

  cloud_run {
    service = google_cloud_run_v2_service.ui.name
  }
}

# Backend service — attaches Cloud Armor and references the serverless NEG
resource "google_compute_backend_service" "ui" {
  name                  = "osrs-ui-backend"
  project               = var.project_id
  protocol              = "HTTPS"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  security_policy       = google_compute_security_policy.ui.id

  backend {
    group = google_compute_region_network_endpoint_group.ui.id
  }
}

resource "google_compute_url_map" "ui" {
  name            = "osrs-ui-url-map"
  project         = var.project_id
  default_service = google_compute_backend_service.ui.id
}

# ---------------------------------------------------------------------------
# HTTPS (created only when var.domain is set)
# ---------------------------------------------------------------------------

resource "google_compute_managed_ssl_certificate" "ui" {
  count   = local.tls_enabled ? 1 : 0
  name    = "osrs-ui-cert"
  project = var.project_id

  managed {
    domains = [var.domain]
  }
}

resource "google_compute_target_https_proxy" "ui" {
  count   = local.tls_enabled ? 1 : 0
  name    = "osrs-ui-https-proxy"
  project = var.project_id
  url_map = google_compute_url_map.ui.id

  ssl_certificates = [google_compute_managed_ssl_certificate.ui[0].id]
}

resource "google_compute_global_forwarding_rule" "ui_https" {
  count                 = local.tls_enabled ? 1 : 0
  name                  = "osrs-ui-https"
  project               = var.project_id
  ip_address            = google_compute_global_address.ui.address
  port_range            = "443"
  target                = google_compute_target_https_proxy.ui[0].id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# ---------------------------------------------------------------------------
# HTTP — always created; redirects to HTTPS when TLS is enabled
# ---------------------------------------------------------------------------

resource "google_compute_url_map" "ui_http_redirect" {
  count   = local.tls_enabled ? 1 : 0
  name    = "osrs-ui-http-redirect"
  project = var.project_id

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "ui" {
  name    = "osrs-ui-http-proxy"
  project = var.project_id
  url_map = local.tls_enabled ? google_compute_url_map.ui_http_redirect[0].id : google_compute_url_map.ui.id
}

resource "google_compute_global_forwarding_rule" "ui_http" {
  name                  = "osrs-ui-http"
  project               = var.project_id
  ip_address            = google_compute_global_address.ui.address
  port_range            = "80"
  target                = google_compute_target_http_proxy.ui.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# ──────────────────────────────────────────────────────────────────────────────
# growth.srpailabs.com  — Recruitment + Sales Agentic Automation Platform
# Cloudflare Origin Certificate (stored at paths below)
# SSL cert: /etc/ssl/cloudflare/growth.srpailabs.com.pem
# SSL key:  /etc/ssl/cloudflare/growth.srpailabs.com.key
# ──────────────────────────────────────────────────────────────────────────────

# ── Rate limiting zones ───────────────────────────────────────────────────────
limit_req_zone $binary_remote_addr zone=growth_api:10m  rate=30r/s;
limit_req_zone $binary_remote_addr zone=growth_auth:10m rate=10r/m;

# ── HTTP → HTTPS redirect ─────────────────────────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name growth.srpailabs.com;
    return 301 https://$host$request_uri;
}

# ── HTTPS main server block ───────────────────────────────────────────────────
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name growth.srpailabs.com;

    # Cloudflare Origin Certificate
    ssl_certificate     /etc/ssl/cloudflare/growth.srpailabs.com.pem;
    ssl_certificate_key /etc/ssl/cloudflare/growth.srpailabs.com.key;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options         "SAMEORIGIN"  always;
    add_header X-Content-Type-Options  "nosniff"     always;
    add_header X-XSS-Protection        "1; mode=block" always;
    add_header Referrer-Policy         "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Upload size (PDF, Word, Excel up to 25MB)
    client_max_body_size 25M;

    # ── API routes → NestJS backend (port 8020) ────────────────────────────
    location /api/ {
        limit_req zone=growth_api burst=60 nodelay;

        proxy_pass         http://127.0.0.1:8020;
        proxy_http_version 1.1;
        proxy_set_header   Host              $http_host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 120s;
        proxy_send_timeout 60s;
    }

    # Tighter rate limit for auth endpoints
    location /api/v1/auth/login {
        limit_req zone=growth_auth burst=20 nodelay;

        proxy_pass         http://127.0.0.1:8020;
        proxy_http_version 1.1;
        proxy_set_header   Host              $http_host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # ── Swagger docs (restrict to non-public in prod if needed) ───────────
    location /api/docs {
        proxy_pass         http://127.0.0.1:8020;
        proxy_http_version 1.1;
        proxy_set_header   Host              $http_host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # ── WebSocket (real-time) ─────────────────────────────────────────────
    location /ws {
        proxy_pass         http://127.0.0.1:8020;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade     $http_upgrade;
        proxy_set_header   Connection  "Upgrade";
        proxy_set_header   Host        $http_host;
        proxy_read_timeout 3600s;
    }

    # ── Frontend → Next.js (port 8021) ────────────────────────────────────
    location / {
        proxy_pass         http://127.0.0.1:8021;
        proxy_http_version 1.1;
        proxy_set_header   Host              $http_host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 60s;

        # Next.js static assets cache
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://127.0.0.1:8021;
            proxy_cache_valid 200 7d;
            add_header Cache-Control "public, max-age=604800, immutable";
        }
    }

    # ── Gzip ──────────────────────────────────────────────────────────────
    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
}

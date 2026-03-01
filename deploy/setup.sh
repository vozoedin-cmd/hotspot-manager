#!/usr/bin/env bash
# =============================================================
# setup.sh — Automated VPS setup for Hotspot Manager
# Compatible: Ubuntu 22.04 LTS on DigitalOcean
# Usage: sudo bash setup.sh YOUR_DOMAIN
# =============================================================
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR="/opt/hotspot"
REPO_URL="${REPO_URL:-}"   # set via environment or edit manually

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: sudo bash setup.sh YOUR_DOMAIN"
  exit 1
fi

echo "============================================="
echo " Hotspot Manager — VPS Setup"
echo " Domain: $DOMAIN"
echo "============================================="

# ── 1. System update ────────────────────────────────────────
echo "[1/9] Updating system..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Docker & Docker Compose ──────────────────────────────
echo "[2/9] Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "$SUDO_USER" 2>/dev/null || true
fi

if ! command -v docker &>/dev/null; then
  echo "Docker installation failed"; exit 1
fi
docker --version

# ── 3. Firewall ─────────────────────────────────────────────
echo "[3/9] Configuring UFW firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload

# ── 4. Clone / copy project ─────────────────────────────────
echo "[4/9] Setting up project directory..."
mkdir -p "$APP_DIR"
if [[ -n "$REPO_URL" ]]; then
  if [[ -d "$APP_DIR/.git" ]]; then
    git -C "$APP_DIR" pull
  else
    git clone "$REPO_URL" "$APP_DIR"
  fi
else
  echo "REPO_URL not set — copy project files to $APP_DIR manually and re-run."
fi

# ── 5. Environment files ────────────────────────────────────
echo "[5/9] Configuring environment variables..."
if [[ ! -f "$APP_DIR/backend/.env" ]]; then
  cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
  JWT_SECRET=$(openssl rand -hex 32)
  JWT_REFRESH=$(openssl rand -hex 32)
  DB_PASS=$(openssl rand -hex 16)

  sed -i "s/DB_PASS=.*/DB_PASS=$DB_PASS/" "$APP_DIR/backend/.env"
  sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" "$APP_DIR/backend/.env"
  sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH/" "$APP_DIR/backend/.env"
  sed -i "s/DB_HOST=.*/DB_HOST=db/" "$APP_DIR/backend/.env"
  sed -i "s/CORS_ORIGINS=.*/CORS_ORIGINS=https:\/\/$DOMAIN/" "$APP_DIR/backend/.env"

  echo ""
  echo "⚠️  Edit $APP_DIR/backend/.env before continuing:"
  echo "   - ADMIN_EMAIL / ADMIN_PASSWORD"
  echo "   - MIKROTIK device credentials if needed"
  echo ""
  read -rp "Press ENTER when done editing .env..."
fi

# ── 6. Nginx domain substitution ────────────────────────────
echo "[6/9] Patching nginx.conf with domain..."
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" "$APP_DIR/deploy/nginx.conf"

# ── 7. Build frontend ────────────────────────────────────────
echo "[7/9] Building React frontend..."
cd "$APP_DIR/frontend"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm ci --silent
npm run build

# ── 8. Start services ────────────────────────────────────────
echo "[8/9] Starting Docker services..."
cd "$APP_DIR"
docker compose -f deploy/docker-compose.yml up -d --build

echo "Waiting for database to be ready..."
sleep 10

echo "Running database migrations and seed..."
docker exec hotspot_app node src/database/seed.js || echo "Seed already run or failed (non-fatal)"

# ── 9. SSL Certificate ──────────────────────────────────────
echo "[9/9] Obtaining SSL certificate via Let's Encrypt..."
docker run --rm \
  -v "$APP_DIR/certbot_www:/var/www/certbot" \
  -v "$APP_DIR/certbot_conf:/etc/letsencrypt" \
  certbot/certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email "admin@$DOMAIN" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN" -d "www.$DOMAIN" || echo "SSL error — check domain DNS and re-run: certbot renew"

docker compose -f deploy/docker-compose.yml restart nginx

echo ""
echo "============================================="
echo " ✅ Setup complete!"
echo " App running at: https://$DOMAIN"
echo "============================================="
echo ""
echo "Useful commands:"
echo "  View logs:    docker compose -f $APP_DIR/deploy/docker-compose.yml logs -f app"
echo "  Restart app:  docker compose -f $APP_DIR/deploy/docker-compose.yml restart app"
echo "  DB shell:     docker exec -it hotspot_db psql -U hotspot_user -d hotspot_db"

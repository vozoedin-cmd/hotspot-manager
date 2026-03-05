#!/bin/bash
# =============================================================================
# enable-ssl.sh — Activa HTTPS con Let's Encrypt para Hotspot Manager
# =============================================================================
# Uso:
#   bash deploy/enable-ssl.sh tu-dominio.com tu-email@ejemplo.com
#
# Requisitos:
#   - DNS del dominio apuntando a la IP de este servidor
#   - Docker y docker compose instalados
#   - El proyecto en /opt/hotspot
# =============================================================================

set -e

DOMAIN="${1}"
EMAIL="${2}"
PROJECT_DIR="/opt/hotspot"
COMPOSE="docker compose --project-directory $PROJECT_DIR -f $PROJECT_DIR/deploy/docker-compose.yml"

# ------------ VALIDACIONES ------------
if [ -z "$DOMAIN" ]; then
  echo "ERROR: Debes indicar el dominio."
  echo "Uso: bash deploy/enable-ssl.sh tu-dominio.com tu-email@ejemplo.com"
  exit 1
fi

if [ -z "$EMAIL" ]; then
  echo "ERROR: Debes indicar un email para Let's Encrypt."
  echo "Uso: bash deploy/enable-ssl.sh tu-dominio.com tu-email@ejemplo.com"
  exit 1
fi

echo "================================================="
echo "  Hotspot Manager — Activar SSL"
echo "  Dominio : $DOMAIN"
echo "  Email   : $EMAIL"
echo "================================================="

# ------------ PASO 1: nginx HTTP (temporal) ------------
echo ""
echo "[1/6] Iniciando nginx en modo HTTP para verificación ACME..."

# Asegurarse de que nginx corre con la config HTTP actual (sin SSL)
$COMPOSE up -d nginx
sleep 3
echo "      nginx OK"

# ------------ PASO 2: Crear directorios certbot ------------
echo ""
echo "[2/6] Preparando directorios de certbot..."
mkdir -p "$PROJECT_DIR/certbot_conf"
mkdir -p "$PROJECT_DIR/certbot_www"

# ------------ PASO 3: Emitir certificado con certbot ------------
echo ""
echo "[3/6] Solicitando certificado a Let's Encrypt..."

docker run --rm \
  -v "$PROJECT_DIR/certbot_conf:/etc/letsencrypt" \
  -v "$PROJECT_DIR/certbot_www:/var/www/certbot" \
  certbot/certbot:latest certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN"

echo "      Certificado emitido OK"

# ------------ PASO 4: Reemplazar placeholder en nginx.ssl.conf ------------
echo ""
echo "[4/6] Configurando nginx SSL con dominio $DOMAIN..."

SSL_CONF="$PROJECT_DIR/deploy/nginx.ssl.conf"

if grep -q "TU_DOMINIO" "$SSL_CONF"; then
  sed -i "s/TU_DOMINIO/$DOMAIN/g" "$SSL_CONF"
  echo "      $SSL_CONF actualizado"
else
  echo "      (nginx.ssl.conf ya tiene el dominio configurado)"
fi

# ------------ PASO 5: Actualizar CORS_ORIGINS en .env ------------
echo ""
echo "[5/6] Actualizando CORS_ORIGINS en .env..."

ENV_FILE="$PROJECT_DIR/backend/.env"

if grep -q "^CORS_ORIGINS=" "$ENV_FILE"; then
  sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=https://$DOMAIN|" "$ENV_FILE"
  echo "      CORS_ORIGINS=https://$DOMAIN"
else
  echo "CORS_ORIGINS=https://$DOMAIN" >> "$ENV_FILE"
  echo "      CORS_ORIGINS añadido al .env"
fi

# También actualizar FRONTEND_URL si existe
if grep -q "^FRONTEND_URL=" "$ENV_FILE"; then
  sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" "$ENV_FILE"
fi

# ------------ PASO 6: Levantar con SSL ------------
echo ""
echo "[6/6] Reiniciando con configuración SSL..."

# Detener nginx actual
$COMPOSE stop nginx

# Levantar con override SSL
docker compose \
  --project-directory "$PROJECT_DIR" \
  -f "$PROJECT_DIR/deploy/docker-compose.yml" \
  -f "$PROJECT_DIR/deploy/docker-compose.ssl.yml" \
  up -d

# Reiniciar backend para que tome el nuevo CORS_ORIGINS
echo "      Reiniciando backend con nuevo env..."
sleep 5

CONTAINER_ID=$(docker ps -q -f name=hotspot_app 2>/dev/null || true)
if [ -n "$CONTAINER_ID" ]; then
  docker stop "$CONTAINER_ID"
  docker rm "$CONTAINER_ID"
fi

docker run -d \
  --name hotspot_app \
  --network deploy_hotspot_net \
  --restart unless-stopped \
  --env-file "$PROJECT_DIR/backend/.env" \
  -e DB_HOST=db \
  -e NODE_ENV=production \
  -v "$PROJECT_DIR/backend/logs:/app/logs" \
  -v "$PROJECT_DIR/backend/backups:/app/backups" \
  hotspot-app:latest

echo ""
echo "================================================="
echo "  SSL activado correctamente"
echo "  URL: https://$DOMAIN"
echo ""
echo "  Renovación automática activa via certbot"
echo "  (cada 12h el contenedor certbot verifica si"
echo "   el certificado necesita renovarse)"
echo "================================================="

# ------------ CONFIGURAR CRON de renovación (opcional) ------------
# Si prefieres cron del sistema en vez del contenedor:
# (crontab -l 2>/dev/null; echo "0 3 * * * docker exec hotspot_certbot certbot renew --quiet") | crontab -

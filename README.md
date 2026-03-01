# 🔐 Hotspot Manager — Panel SaaS para fichas MikroTik

Sistema de gestión de vouchers/fichas Hotspot con panel administrativo web, app móvil para vendedores y sincronización en tiempo real con MikroTik RouterOS.

---

## ✅ Características

| Función | Descripción |
|---------|-------------|
| Administración de fichas | Generar, vender, deshabilitar vouchers desde el panel |
| Múltiples MikroTik | Soporte para varios routers con zona asignada |
| Vendedores con saldo | Límite mensual configurable (ej: Q2,000) |
| Sincronización bidireccional | Cron + webhook MikroTik ↔ VPS |
| Tiempo real | Socket.io — actualizaciones push sin recargar |
| App móvil (PWA) | Layout mobile-first para vendedores |
| Reportes | Dashboard, ventas por vendedor/paquete, gráficas |
| Auditoría | Log completo de todas las acciones |
| JWT seguro | Access token 24h + Refresh token 7d con rotación |
| SSL automático | Let's Encrypt via Certbot |

---

## 🗂 Estructura del proyecto

```
/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── config/       # DB, Logger
│   │   ├── controllers/  # auth, vouchers, sellers, packages, mikrotik, reports
│   │   ├── middleware/   # auth JWT, auditLog, errorHandler
│   │   ├── models/       # Sequelize (User, MikrotikDevice, Package, Voucher, Sale, SellerBalance, Transaction, AuditLog)
│   │   ├── routes/       # Express routers
│   │   ├── services/     # mikrotikService, voucherService, syncService
│   │   └── database/     # seed.js
│   └── Dockerfile
├── frontend/             # React 18 + Vite + Tailwind
│   └── src/
│       ├── layouts/      # AdminLayout, SellerLayout
│       ├── pages/
│       │   ├── admin/    # Dashboard, Vouchers, Generate, Packages, Sellers, MikroTik, Reports, Audit
│       │   └── seller/   # Dashboard, SellVoucher, SalesHistory, Profile
│       ├── services/     # api.js (axios + interceptors)
│       └── store/        # authStore (Zustand)
└── deploy/               # docker-compose.yml, nginx.conf, setup.sh
```

---

## 🚀 Despliegue en DigitalOcean (Ubuntu 22.04)

### Requisitos previos
- Droplet con al menos **1 GB RAM / 1 CPU**
- Dominio apuntando al IP del Droplet (A record)
- Puerto **8728** o **8729** del MikroTik accesible desde el VPS

### Instalación automática

```bash
# 1. Clonar el repositorio en el servidor
git clone https://github.com/TU_USUARIO/hotspot-manager.git /opt/hotspot
cd /opt/hotspot

# 2. Ejecutar el script de instalación
sudo bash deploy/setup.sh TU_DOMINIO.com
```

El script realiza automáticamente:
1. Actualización del sistema
2. Instalación de Docker + Docker Compose
3. Configuración del firewall (UFW)
4. Generación de secretos JWT y contraseña de BD
5. Build del frontend React
6. Inicio de todos los servicios (app, db, nginx)
7. Migraciones y seed de datos iniciales
8. Obtención del certificado SSL con Let's Encrypt

---

## ⚙️ Variables de entorno (`backend/.env`)

```env
# Base de datos
DB_HOST=db
DB_PORT=5432
DB_NAME=hotspot_db
DB_USER=hotspot_user
DB_PASS=TU_CLAVE_SEGURA

# JWT
JWT_SECRET=...generado_automaticamente...
JWT_REFRESH_SECRET=...generado_automaticamente...
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# App
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://tu-dominio.com

# Admin inicial
ADMIN_EMAIL=admin@tu-dominio.com
ADMIN_PASSWORD=Admin@123!

# Sync MikroTik
SYNC_INTERVAL_MINUTES=5
MIKROTIK_TIMEOUT=10000
```

---

## 🔌 Configuración del Webhook en MikroTik

Para sincronización instantánea agrega en **IP > Hotspot > Server Profiles > On Login / On Logout**:

```
# On Login
/tool fetch url="https://tu-dominio.com/api/webhook/mikrotik/DEVICE_ID" \
  http-method=post \
  http-data="event=login&username=$username&ip=$address&mac=$mac-address" \
  keep-result=no

# On Logout / Expire
/tool fetch url="https://tu-dominio.com/api/webhook/mikrotik/DEVICE_ID" \
  http-method=post \
  http-data="event=logout&username=$username&ip=$address" \
  keep-result=no
```

Reemplaza `DEVICE_ID` con el UUID del dispositivo creado en el panel.

---

## 👤 Credenciales iniciales

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@hotspot.com | Admin@123! |
| Vendedor demo | vendedor@hotspot.com | Vendedor@123! |

> ⚠️ Cambia estas contraseñas inmediatamente en producción.

---

## 📦 Paquetes incluidos en el seed

| Nombre | Duración | Precio (Q) |
|--------|----------|------------|
| 30 Minutos | 30 min | Q3.00 |
| 1 Hora | 1 hr | Q5.00 |
| 3 Horas | 3 hr | Q10.00 |
| 1 Día | 1 día | Q20.00 |
| 1 Semana | 7 días | Q100.00 |
| 1 Mes | 30 días | Q350.00 |

---

## 🛠 Desarrollo local

```bash
# Backend
cd backend
npm install
cp .env.example .env   # Edita con tus credenciales
npm run dev            # Puerto 3000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev            # Puerto 3001 (proxy → 3000)
```

Base de datos local: PostgreSQL corriendo en localhost:5432.

---

## 🔒 Compatibilidad RouterOS

| RouterOS | Soporte |
|----------|---------|
| v6.x | ✅ Puerto 8728 (sin SSL) |
| v7.x | ✅ Puerto 8729 (SSL) o 8728 |

---

## 📡 API Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, retorna tokens |
| POST | `/api/auth/refresh` | Renovar access token |
| GET | `/api/vouchers` | Listar fichas (admin) |
| POST | `/api/vouchers/generate` | Generar lote (admin) |
| POST | `/api/vouchers/sell` | Vender ficha (seller) |
| GET | `/api/packages` | Listar paquetes |
| GET | `/api/sellers` | Listar vendedores (admin) |
| POST | `/api/sellers/:id/reload-balance` | Recargar saldo |
| POST | `/api/mikrotik/:id/sync` | Sincronizar router |
| GET | `/api/reports/dashboard` | Dashboard admin |
| GET | `/api/reports/seller-dashboard` | Dashboard vendedor |
| POST | `/api/webhook/mikrotik/:id` | Webhook desde MikroTik |

---

## 🐳 Comandos Docker útiles

```bash
# Ver logs en tiempo real
docker compose -f deploy/docker-compose.yml logs -f app

# Reiniciar solo la app
docker compose -f deploy/docker-compose.yml restart app

# Acceder a la base de datos
docker exec -it hotspot_db psql -U hotspot_user -d hotspot_db

# Ejecutar seed manualmente
docker exec hotspot_app node src/database/seed.js

# Renovar SSL manualmente
docker exec hotspot_certbot certbot renew
```

---

## 📄 Licencia

MIT — uso libre para proyectos comerciales y personales.

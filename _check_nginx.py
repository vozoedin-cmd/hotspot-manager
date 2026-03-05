import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=30)

# Estado de contenedores
print("=== Docker PS ===")
_, out, _ = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1')
print(out.read().decode(errors='replace'))

# Test directo al backend (puerto 3000)
print("=== Login directo al backend (port 3000) ===")
_, out, _ = ssh.exec_command(
    'curl -s -m 5 -X POST http://127.0.0.1:3000/api/auth/login '
    '-H "Content-Type: application/json" '
    '-d \'{"email":"admin@hotspot.com","password":"admin123"}\' 2>&1'
)
print(out.read().decode(errors='replace'))

# Test via nginx (puerto 80)
print("\n=== Login via nginx (port 80) ===")
_, out, _ = ssh.exec_command(
    'curl -s -m 5 -X POST http://127.0.0.1:80/api/auth/login '
    '-H "Content-Type: application/json" '
    '-d \'{"email":"admin@hotspot.com","password":"admin123"}\' 2>&1'
)
print(out.read().decode(errors='replace'))

# Nginx config
print("\n=== Nginx upstream config ===")
_, out, _ = ssh.exec_command('docker exec hotspot_nginx cat /etc/nginx/conf.d/default.conf 2>&1 | grep -A3 upstream')
print(out.read().decode(errors='replace'))

# Logs nginx
print("\n=== Nginx logs ===")
_, out, _ = ssh.exec_command('docker logs --tail 10 hotspot_nginx 2>&1')
print(out.read().decode(errors='replace'))

ssh.close()

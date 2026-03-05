"""
Deploy: packages filtrados por router + campo device_id en BD
"""
import paramiko, os

host = '167.99.58.189'
user = 'root'
pwd  = '1998humber-C1d'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=pwd, timeout=30)
sftp = ssh.open_sftp()
print('Conectado')

# ── 1. Migración de BD ──────────────────────────────────────────────────────
sql = (
    "ALTER TABLE packages "
    "ADD COLUMN IF NOT EXISTS device_id UUID "
    "REFERENCES mikrotik_devices(id) ON DELETE SET NULL;"
)
cmd = f'docker exec hotspot_db psql -U hotspot_user -d hotspot_db -c "{sql}"'
_, out, err = ssh.exec_command(cmd)
out.channel.recv_exit_status()
print('Migración BD:', out.read().decode(errors='replace').strip() or err.read().decode(errors='replace').strip())

# ── 2. Upload backend ───────────────────────────────────────────────────────
backend_files = [
    (r'backend\src\models\Package.js',            '/opt/hotspot/backend/src/models/Package.js'),
    (r'backend\src\models\index.js',              '/opt/hotspot/backend/src/models/index.js'),
    (r'backend\src\controllers\packageController.js', '/opt/hotspot/backend/src/controllers/packageController.js'),
]
for lpath, rpath in backend_files:
    sftp.put(lpath, rpath)
    print('Backend subido:', rpath)

# ── 3. Upload frontend dist ─────────────────────────────────────────────────
remote_dist = '/opt/hotspot/frontend/dist'
ssh.exec_command(f'rm -rf {remote_dist} && mkdir -p {remote_dist}')[1].channel.recv_exit_status()

def upload_dir(sftp, local_dir, remote_dir):
    ssh.exec_command(f'mkdir -p {remote_dir}')[1].channel.recv_exit_status()
    for entry in os.listdir(local_dir):
        local_path  = os.path.join(local_dir, entry)
        remote_path = remote_dir + '/' + entry
        if os.path.isdir(local_path):
            upload_dir(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)

upload_dir(sftp, r'frontend\dist', remote_dist)
print('Frontend dist subido')

# ── 4. Restart backend ──────────────────────────────────────────────────────
_, out, _ = ssh.exec_command('cat /opt/hotspot/backend/.env')
env_content = out.read().decode(errors='replace')

# Obtener variables del .env para el docker run
env_vars = {}
for line in env_content.splitlines():
    line = line.strip()
    if '=' in line and not line.startswith('#'):
        k, _, v = line.partition('=')
        env_vars[k.strip()] = v.strip()

print('Reiniciando backend...')
restart_cmd = (
    'docker stop hotspot_app 2>/dev/null; '
    'docker rm hotspot_app 2>/dev/null; '
    'docker run -d --name hotspot_app '
    '--network deploy_hotspot_net '
    '--restart unless-stopped '
    '--env-file /opt/hotspot/backend/.env '
    '-e DB_HOST=db '
    '-e NODE_ENV=production '
    '-v /opt/hotspot/backend/logs:/app/logs '
    '-v /opt/hotspot/backend/backups:/app/backups '
    'hotspot-app:latest'
)
_, out, err = ssh.exec_command(restart_cmd)
out.channel.recv_exit_status()
print('Backend reiniciado:', out.read().decode(errors='replace').strip() or err.read().decode(errors='replace').strip())

import time; time.sleep(5)
_, out, _ = ssh.exec_command('docker logs --tail 15 hotspot_app 2>&1')
print('--- Logs backend ---')
print(out.read().decode(errors='replace'))

# ── 5. Reload nginx ─────────────────────────────────────────────────────────
_, out, _ = ssh.exec_command('docker exec hotspot_nginx nginx -s reload 2>&1')
print('Nginx reload:', out.read().decode(errors='replace').strip())

sftp.close()
ssh.close()
print('\n=== DEPLOY COMPLETO ===')

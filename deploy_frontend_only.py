"""
Sube solo el frontend dist y reinicia backend + nginx
"""
import paramiko, os, time

host = '167.99.58.189'
user = 'root'
pwd  = '1998humber-C1d'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=pwd, timeout=30)
sftp = ssh.open_sftp()
print('Conectado')

# ── Upload frontend dist ─────────────────────────────────────────────────────
remote_dist = '/opt/hotspot/frontend/dist'
ssh.exec_command(f'rm -rf {remote_dist} && mkdir -p {remote_dist}')[1].channel.recv_exit_status()

def upload_dir(sftp, ssh, local_dir, remote_dir):
    stdin, stdout, stderr = ssh.exec_command(f'mkdir -p {remote_dir}')
    stdout.channel.recv_exit_status()
    for entry in os.listdir(local_dir):
        local_path  = os.path.join(local_dir, entry)
        remote_path = remote_dir + '/' + entry
        if os.path.isdir(local_path):
            upload_dir(sftp, ssh, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)
            print(f'  {remote_path}')

upload_dir(sftp, ssh, r'frontend\dist', remote_dist)
print('Frontend dist subido')

# ── Restart backend ──────────────────────────────────────────────────────────
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

time.sleep(6)
_, out, _ = ssh.exec_command('docker logs --tail 15 hotspot_app 2>&1')
print('--- Logs ---')
print(out.read().decode(errors='replace'))

# ── Reload nginx ─────────────────────────────────────────────────────────────
_, out, _ = ssh.exec_command('docker exec hotspot_nginx nginx -s reload 2>&1')
print('Nginx reload:', out.read().decode(errors='replace').strip())

sftp.close()
ssh.close()
print('\n=== DEPLOY COMPLETO ===')

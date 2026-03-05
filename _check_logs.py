import paramiko, os, time
BASE = r'C:\Users\Dell\Desktop\fdfgrfg'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=30)
sftp = ssh.open_sftp()

# 1. Subir archivos backend modificados
sftp.put(os.path.join(BASE, r'backend\src\services\voucherService.js'), '/opt/hotspot/backend/src/services/voucherService.js')
print('voucherService.js subido')
sftp.put(os.path.join(BASE, r'backend\src\services\mikrotikService.js'), '/opt/hotspot/backend/src/services/mikrotikService.js')
print('mikrotikService.js subido')
sftp.put(os.path.join(BASE, r'backend\src\controllers\voucherController.js'), '/opt/hotspot/backend/src/controllers/voucherController.js')
print('voucherController.js subido')

# 2. Subir frontend dist
remote_dist = '/opt/hotspot/frontend/dist'
# IMPORTANTE: borrar CONTENIDO pero NO el directorio (rm -rf dir rompe el bind mount de nginx)
ssh.exec_command(f'mkdir -p {remote_dist} && find {remote_dist} -mindepth 1 -delete')[1].channel.recv_exit_status()

def upload_dir(sftp, ssh, local_dir, remote_dir):
    ssh.exec_command(f'mkdir -p {remote_dir}')[1].channel.recv_exit_status()
    for entry in os.listdir(local_dir):
        local_path  = os.path.join(local_dir, entry)
        remote_path = remote_dir + '/' + entry
        if os.path.isdir(local_path):
            upload_dir(sftp, ssh, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)

upload_dir(sftp, ssh, os.path.join(BASE, r'frontend\dist'), remote_dist)
print('Frontend dist subido')

# 3. Rebuild + restart en background (no esperar)
build_restart = (
    'docker build -t hotspot-app:latest /opt/hotspot/backend/ > /tmp/docker_build.log 2>&1 && '
    'docker stop hotspot_app 2>/dev/null; docker rm hotspot_app 2>/dev/null; '
    'docker run -d --name hotspot_app --network deploy_hotspot_net --restart unless-stopped '
    '--env-file /opt/hotspot/backend/.env -e DB_HOST=db -e NODE_ENV=production '
    '-v /opt/hotspot/backend/logs:/app/logs -v /opt/hotspot/backend/backups:/app/backups '
    'hotspot-app:latest && echo RESTART_OK >> /tmp/docker_build.log'
)
ssh.exec_command(f'nohup bash -c \'{build_restart}\' > /tmp/docker_build.log 2>&1 &')
print('Build+restart lanzado en background, esperando 90s...')
sftp.close()
ssh.close()

# Esperar y reconectar para ver resultado
time.sleep(90)
ssh2 = paramiko.SSHClient()
ssh2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh2.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=30)

_, out, _ = ssh2.exec_command('tail -5 /tmp/docker_build.log 2>&1')
print('Build log:', out.read().decode(errors='replace'))

_, out, _ = ssh2.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}" 2>&1')
print(out.read().decode(errors='replace'))

_, out, _ = ssh2.exec_command('docker logs --tail 6 hotspot_app 2>&1')
print(out.read().decode(errors='replace'))

ssh2.exec_command('docker exec hotspot_nginx nginx -s reload 2>/dev/null')
print('Nginx reloaded')
ssh2.close()
print('=== DONE ===')

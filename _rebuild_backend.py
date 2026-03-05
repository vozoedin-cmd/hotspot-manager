import paramiko, time, os

BASE = r'C:\Users\Dell\Desktop\fdfgrfg'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=30)

# Subir los 3 archivos modificados
sftp = ssh.open_sftp()
sftp.put(os.path.join(BASE, r'backend\src\services\voucherService.js'), '/opt/hotspot/backend/src/services/voucherService.js')
print('voucherService.js subido')
sftp.put(os.path.join(BASE, r'backend\src\services\mikrotikService.js'), '/opt/hotspot/backend/src/services/mikrotikService.js')
print('mikrotikService.js subido')
sftp.put(os.path.join(BASE, r'backend\src\controllers\voucherController.js'), '/opt/hotspot/backend/src/controllers/voucherController.js')
print('voucherController.js subido')
sftp.close()

cmd = (
    'docker build -t hotspot-app:latest /opt/hotspot/backend/ > /tmp/docker_build.log 2>&1 && '
    'docker stop hotspot_app 2>/dev/null; docker rm hotspot_app 2>/dev/null; '
    'docker run -d --name hotspot_app --network deploy_hotspot_net --restart unless-stopped '
    '--env-file /opt/hotspot/backend/.env -e DB_HOST=db -e NODE_ENV=production '
    '-v /opt/hotspot/backend/logs:/app/logs -v /opt/hotspot/backend/backups:/app/backups '
    'hotspot-app:latest && echo RESTART_OK >> /tmp/docker_build.log'
)
ssh.exec_command('nohup bash -c \'' + cmd + '\' > /tmp/docker_build.log 2>&1 &')
print('Build lanzado. Esperando 90s...')
ssh.close()

time.sleep(90)

ssh2 = paramiko.SSHClient()
ssh2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh2.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=30)

_, o, _ = ssh2.exec_command('tail -5 /tmp/docker_build.log')
print('Build log:', o.read().decode(errors='replace'))

_, o, _ = ssh2.exec_command('docker ps --format "table {{.Names}}\\t{{.Status}}"')
print(o.read().decode(errors='replace'))

_, o, _ = ssh2.exec_command('docker logs --tail 5 hotspot_app 2>&1')
print('App logs:', o.read().decode(errors='replace'))
ssh2.close()
print('=== DONE ===')

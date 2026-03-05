import paramiko, time
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=30)

print("=== Mounts del contenedor hotspot_app ===")
_, out, _ = ssh.exec_command('docker inspect hotspot_app --format "{{json .HostConfig.Binds}}" 2>&1')
print(out.read().decode(errors='replace'))

print("\n=== Rebuilding image hotspot-app:latest ===")
_, out, _ = ssh.exec_command('docker build -t hotspot-app:latest /opt/hotspot/backend/ 2>&1')
out.channel.recv_exit_status()
output = out.read().decode(errors='replace')
# Mostrar solo las ultimas lineas
lines = output.strip().splitlines()
for l in lines[-15:]:
    print(l)

print("\n=== Reiniciando contenedor ===")
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
print(out.read().decode(errors='replace').strip() or err.read().decode(errors='replace').strip())

time.sleep(5)
_, out, _ = ssh.exec_command('docker logs --tail 10 hotspot_app 2>&1')
print('\n=== Logs ===')
print(out.read().decode(errors='replace'))

ssh.close()

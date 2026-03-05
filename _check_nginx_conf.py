import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=30)

# Ver config actual en VPS
print("=== /etc/nginx/conf.d/default.conf (VPS) ===")
_, out, _ = ssh.exec_command('cat /opt/hotspot/nginx.conf 2>/dev/null || docker run --rm -v hotspot_nginx_conf:/etc/nginx/conf.d alpine cat /etc/nginx/conf.d/default.conf 2>&1')
print(out.read().decode(errors='replace'))

print("\n=== Archivos en /opt/hotspot/ ===")
_, out, _ = ssh.exec_command('ls -la /opt/hotspot/ 2>&1')
print(out.read().decode(errors='replace'))

print("\n=== Volúmenes del nginx ===")
_, out, _ = ssh.exec_command('docker inspect hotspot_nginx --format "{{json .HostConfig.Binds}}" 2>&1')
print(out.read().decode(errors='replace'))

ssh.close()

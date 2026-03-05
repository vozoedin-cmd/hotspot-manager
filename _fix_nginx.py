import paramiko, time
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=30)
sftp = ssh.open_sftp()

# Subir nginx.conf corregido
sftp.put(r'deploy\nginx.conf', '/opt/hotspot/deploy/nginx.conf')
print('nginx.conf subido')

# Reiniciar nginx
_, out, _ = ssh.exec_command('docker restart hotspot_nginx 2>&1')
out.channel.recv_exit_status()
print('nginx restart:', out.read().decode(errors='replace').strip())

time.sleep(4)

# Verificar estado
_, out, _ = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}" 2>&1')
print('\n=== Estado contenedores ===')
print(out.read().decode(errors='replace'))

# Probar login
print('=== Test login ===')
_, out, _ = ssh.exec_command(
    'curl -s -m 8 -X POST http://127.0.0.1:80/api/auth/login '
    '-H "Content-Type: application/json" '
    '-d \'{"email":"admin@hotspot.com","password":"admin123"}\' 2>&1'
)
print(out.read().decode(errors='replace'))

_, out, _ = ssh.exec_command('docker logs --tail 5 hotspot_nginx 2>&1')
print('\n=== Nginx logs ===')
print(out.read().decode(errors='replace'))

sftp.close()
ssh.close()

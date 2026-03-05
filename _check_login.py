import paramiko, time
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=30)

# Probar login via curl
_, out, _ = ssh.exec_command(
    'curl -s -X POST http://localhost:3000/api/auth/login '
    '-H "Content-Type: application/json" '
    '-d \'{"email":"admin@hotspot.com","password":"admin123"}\' 2>&1'
)
print("=== Respuesta login ===")
print(out.read().decode(errors='replace'))

# Logs despues del attempt
time.sleep(1)
_, out, _ = ssh.exec_command('docker logs --tail 20 hotspot_app 2>&1')
print("\n=== Logs recientes ===")
print(out.read().decode(errors='replace'))

ssh.close()

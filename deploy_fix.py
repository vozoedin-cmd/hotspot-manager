import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=10)

# git pull
_, out, _ = client.exec_command("cd /opt/hotspot && git pull origin main 2>&1 | tail -3", timeout=20)
out.channel.recv_exit_status()
print("git pull:", out.read().decode())

# Rebuild con docker compose usando la ruta correcta del deploy
print("Rebuilding imagen... (puede tardar 1-2 min)")
_, out2, _ = client.exec_command(
    "cd /opt/hotspot/deploy && docker compose build --no-cache app 2>&1 | tail -15",
    timeout=180
)
time.sleep(130)
print("Build:", out2.read().decode())

# Restart con nueva imagen
_, out3, _ = client.exec_command(
    "cd /opt/hotspot/deploy && docker compose up -d app 2>&1 | tail -5",
    timeout=30
)
time.sleep(15)
print("Up:", out3.read().decode())

# Verificar
_, out4, _ = client.exec_command('docker ps --format "{{.Names}} {{.Status}}" | grep hotspot', timeout=10)
out4.channel.recv_exit_status()
print("Containers:", out4.read().decode())

client.close()

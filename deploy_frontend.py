import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=10)

# git pull
_, out, _ = client.exec_command("cd /opt/hotspot && git pull origin main 2>&1 | tail -3", timeout=20)
out.channel.recv_exit_status()
print("git pull:", out.read().decode())

# Build frontend
print("Building frontend... (puede tardar ~30s)")
_, out2, _ = client.exec_command(
    "cd /opt/hotspot/frontend && npm run build 2>&1 | tail -10",
    timeout=120
)
time.sleep(90)
print("Build:", out2.read().decode())

# Verificar que el dist fue actualizado
_, out3, _ = client.exec_command(
    "ls -la /opt/hotspot/frontend/dist/ | head -5",
    timeout=10
)
out3.channel.recv_exit_status()
print("\nDist files:", out3.read().decode())

print("Frontend actualizado. Nginx sirve los archivos directamente desde /opt/hotspot/frontend/dist/")
client.close()

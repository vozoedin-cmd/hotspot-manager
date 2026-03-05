import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=10)

# Ver el docker-compose.yml del deploy
_, out, _ = client.exec_command("cat /opt/hotspot/deploy/docker-compose.yml", timeout=10)
out.channel.recv_exit_status()
print("deploy/docker-compose.yml:")
print(out.read().decode())

# Ver el setup.sh para entender el deploy
_, out2, _ = client.exec_command("cat /opt/hotspot/deploy/setup.sh | head -60", timeout=10)
out2.channel.recv_exit_status()
print("\nsetup.sh (primeras 60 lineas):")
print(out2.read().decode())

client.close()

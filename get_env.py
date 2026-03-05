import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=10)

_, out, _ = client.exec_command("cat /opt/hotspot/.env 2>/dev/null | grep -E 'ADMIN|SECRET|PASS'", timeout=10)
time.sleep(3)
print(out.read().decode())
client.close()

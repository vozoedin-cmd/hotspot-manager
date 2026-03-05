import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=10)

# Ver estructura completa
_, out, _ = client.exec_command(
    "echo '=== /opt/hotspot ===' && ls -la /opt/hotspot/ && "
    "echo '=== docker-compose files ===' && find /opt/hotspot -name 'docker-compose*' 2>/dev/null && "
    "echo '=== docker inspect volumes ===' && docker inspect hotspot_app --format '{{json .HostConfig.Binds}}' 2>/dev/null",
    timeout=10
)
time.sleep(5)
print(out.read().decode())
client.close()

import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=30)

# Corregir typo hotspot_server en Yiquiche
_, out, _ = ssh.exec_command(
    "docker exec hotspot_db psql -U hotspot_user -d hotspot_db -c "
    "\"UPDATE mikrotik_devices SET hotspot_server='hotspot1' WHERE name='Yiquiche' AND hotspot_server='hotspo1';\" 2>&1"
)
print('Yiquiche fix:', out.read().decode(errors='replace').strip())

# Verificar estado final
_, out, _ = ssh.exec_command(
    "docker exec hotspot_db psql -U hotspot_user -d hotspot_db -c "
    "\"SELECT name, username, password, hotspot_server, status FROM mikrotik_devices ORDER BY name;\" 2>&1"
)
print(out.read().decode(errors='replace'))
ssh.close()

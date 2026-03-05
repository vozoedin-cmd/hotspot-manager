import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=10)

# Verificar device_id actual en vendedores
_, out, _ = client.exec_command(
    "docker exec hotspot_db psql -U hotspot_user -d hotspot_db -c "
    "\"SELECT id, name, email, device_id FROM users WHERE role='seller' ORDER BY created_at;\"",
    timeout=10
)
time.sleep(3)
print("=== VENDEDORES (antes del test) ===")
print(out.read().decode())

# Ver dispositivos disponibles
_, out2, _ = client.exec_command(
    "docker exec hotspot_db psql -U hotspot_user -d hotspot_db -c "
    "\"SELECT id, name FROM mikrotik_devices ORDER BY name;\"",
    timeout=10
)
time.sleep(3)
print("=== DISPOSITIVOS ===")
print(out2.read().decode())

client.close()

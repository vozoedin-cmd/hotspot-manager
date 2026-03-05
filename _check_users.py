import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=30)

# Asignar paquetes a sus routers según el nombre
# "saqchaj" → router SAQCHAJ
# "karina"  → router KARINA
assignments = [
    ("SAQCHAJ", "saqchaj"),
    ("KARINA",  "karina"),
]

for router_name, keyword in assignments:
    sql = (
        f"UPDATE packages SET device_id = "
        f"(SELECT id FROM mikrotik_devices WHERE name = '{router_name}' LIMIT 1) "
        f"WHERE LOWER(name) LIKE '%{keyword}%' AND device_id IS NULL;"
    )
    _, out, _ = ssh.exec_command(
        f"docker exec hotspot_db psql -U hotspot_user -d hotspot_db -c \"{sql}\" 2>&1"
    )
    print(f"Asignar {router_name}:", out.read().decode(errors='replace').strip())

print("\n=== Estado final paquetes ===")
_, out, _ = ssh.exec_command(
    "docker exec hotspot_db psql -U hotspot_user -d hotspot_db -c "
    "\"SELECT p.name, p.price, COALESCE(d.name, 'GLOBAL') as router "
    "FROM packages p LEFT JOIN mikrotik_devices d ON d.id = p.device_id "
    "ORDER BY router, p.name;\" 2>&1"
)
print(out.read().decode(errors='replace'))
ssh.close()

import paramiko, time, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=10)

# Escribir script de prueba en el VPS y ejecutarlo
test_script = r"""
import json, urllib.request

# Login
login_data = json.dumps({"email": "admin@hotspot.com", "password": "Admin@123!"}).encode()
req = urllib.request.Request("http://localhost/api/auth/login", data=login_data, headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req, timeout=10) as r:
    resp = json.loads(r.read().decode())
token = resp.get("access_token", "")
print(f"LOGIN OK, token: {token[:30]}")

# PUT device_id a Humberto Cuz (CUZO-SANM) 
put_data = json.dumps({"device_id": "5d9e3f1a-64f4-4540-b30f-8a1138c5d5a1"}).encode()
req2 = urllib.request.Request(
    "http://localhost/api/sellers/ae3f1c91-a20b-406a-981b-cfe0d05e205a",
    data=put_data,
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    method="PUT"
)
try:
    with urllib.request.urlopen(req2, timeout=10) as r:
        body = r.read().decode()
        resp2 = json.loads(body)
        print(f"PUT status: OK")
        print(f"Full response: {json.dumps(resp2, indent=2)[:600]}")
except Exception as e:
    print(f"PUT error: {e}")
"""

# Limpiar archivo anterior y escribir nuevo
_, _, _ = client.exec_command("rm -f /tmp/test_api.py", timeout=5)
time.sleep(0.5)

# Subir script via SFTP
sftp = client.open_sftp()
with sftp.file('/tmp/test_api.py', 'w') as f:
    f.write(test_script)
sftp.close()

# Ejecutar y capturar logs al mismo tiempo
_, _, _ = client.exec_command("truncate -s 0 /tmp/app.log 2>/dev/null; true", timeout=5)
time.sleep(0.5)

_, out, err = client.exec_command("python3 /tmp/test_api.py 2>&1", timeout=20)
time.sleep(10)
print("API test:")
print(out.read().decode())

# Ver logs recientes del backend
_, out2, _ = client.exec_command("docker logs --tail 30 hotspot_app 2>&1 | tail -30", timeout=10)
time.sleep(3)
print("\n=== LOGS BACKEND (ultimas 30 lineas) ===")
print(out2.read().decode())

# Verificar DB
_, out3, _ = client.exec_command(
    "docker exec hotspot_db psql -U hotspot_user -d hotspot_db -c "
    "\"SELECT name, device_id FROM users WHERE role='seller' ORDER BY name;\"",
    timeout=10
)
time.sleep(3)
print("\n=== DB RESULTADO ===")
print(out3.read().decode())

client.close()

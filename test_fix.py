import paramiko, time, json, urllib.request, urllib.parse

# 1. Login como admin para obtener token
login_data = json.dumps({"email": "admin@hotspot.com", "password": "CHINAHA11"}).encode()
req = urllib.request.Request(
    "http://167.99.58.189/api/auth/login",
    data=login_data,
    headers={"Content-Type": "application/json"},
    method="POST"
)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        result = json.loads(resp.read().decode())
        token = result.get('token')
        print(f"Login: OK, token: {token[:20]}...")
except Exception as e:
    print(f"Login error: {e}")
    exit(1)

# 2. Actualizar Humberto Cuz con device_id = CUZO-SANM
seller_id = "ae3f1c91-a20b-406a-981b-cfe0d05e205a"
cuzo_sanm_id = "5d9e3f1a-64f4-4540-b30f-8a1138c5d5a1"

update_data = json.dumps({"device_id": cuzo_sanm_id}).encode()
req2 = urllib.request.Request(
    f"http://167.99.58.189/api/sellers/{seller_id}",
    data=update_data,
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    method="PUT"
)
try:
    with urllib.request.urlopen(req2, timeout=10) as resp:
        result2 = json.loads(resp.read().decode())
        seller = result2.get('data', {})
        print(f"Update: OK")
        print(f"  device_id en respuesta: {seller.get('device_id')}")
        device = seller.get('device') or {}
        print(f"  device.name en respuesta: {device.get('name')}")
except Exception as e:
    print(f"Update error: {e}")

# 3. Verificar en DB
time.sleep(1)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=10)
_, out, _ = client.exec_command(
    "docker exec hotspot_db psql -U hotspot_user -d hotspot_db -c "
    "\"SELECT name, device_id FROM users WHERE id='ae3f1c91-a20b-406a-981b-cfe0d05e205a';\"",
    timeout=10
)
time.sleep(3)
print("\n=== DB DESPUES DEL UPDATE ===")
print(out.read().decode())
client.close()

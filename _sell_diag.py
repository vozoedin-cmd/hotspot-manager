import paramiko, time

host = '167.99.58.189'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
for i in range(5):
    try:
        ssh.connect(host, username='root', password='1998humber-C1d', timeout=20)
        print("Conectado!"); break
    except Exception as e:
        print(f"Intento {i+1}: {e}"); time.sleep(5)

def run(cmd, timeout=30):
    print(f"\n>>> {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    print((out + err).strip())
    return (out + err).strip()

# Ver logs recientes del app
run('docker logs hotspot_app --tail=50 2>&1')

# Probar el endpoint sell directamente
print("\n=== TEST: Login vendedor ===")
login = run("""curl -s -X POST http://localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"vendedor@hotspot.com","password":"Vendedor@123!"}' """)

import json, re
try:
    token = json.loads(login).get('access_token', '')
    print(f"Token: {token[:30]}...")
    
    # Obtener primer paquete con fichas disponibles
    pkgs = run(f"""curl -s http://localhost/api/packages \
      -H 'Authorization: Bearer {token}'""")
    pkg_data = json.loads(pkgs)
    packages = pkg_data.get('data', [])
    print(f"\nPaquetes: {[p['name']+' id:'+p['id'][:8] for p in packages[:3]]}")
    
    if packages:
        pkg_id = packages[0]['id']
        print(f"\n=== TEST: Vender ficha paquete {packages[0]['name']} ===")
        sell_result = run(f"""curl -s -X POST http://localhost/api/vouchers/sell \
          -H 'Content-Type: application/json' \
          -H 'Authorization: Bearer {token}' \
          -d '{{"packageId": "{pkg_id}"}}'""")
        print("RESULTADO SELL:", sell_result)
except Exception as e:
    print(f"Parse error: {e}")

# Ver si el vendedor tiene balance
print("\n=== Balance vendedor en BD ===")
run("""docker exec hotspot_db psql -U hotspot_user -d hotspot_db -c "
SELECT u.email, u.role, sb.balance, sb.monthly_limit 
FROM users u LEFT JOIN seller_balances sb ON sb.seller_id = u.id
WHERE u.role = 'seller';" """)

ssh.close()

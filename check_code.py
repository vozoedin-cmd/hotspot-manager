import paramiko, time, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=10)

# Ver commit actual en el VPS
_, out, _ = client.exec_command("cd /opt/hotspot && git log --oneline -3", timeout=5)
time.sleep(2)
print("Git log VPS:")
print(out.read().decode())

# Ver las lineas del controller en el contenedor (el archivo en la imagen)
_, out2, _ = client.exec_command(
    "docker exec hotspot_app cat /app/src/controllers/sellerController.js | grep -n 'device_id\\|rowCount\\|bind\\|Actualizando' | head -20",
    timeout=10
)
time.sleep(3)
print("\nCodigo en contenedor:")
print(out2.read().decode())

client.close()

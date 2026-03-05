import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=10)

# Ver codigo del controller en el contenedor
_, out, _ = client.exec_command(
    "docker exec hotspot_app grep -n 'rowCount\\|Actualizando\\|setDevice\\|bind.*device\\|device_id' "
    "/app/src/controllers/sellerController.js | head -20",
    timeout=10
)
out.channel.recv_exit_status()
result = out.read().decode()
print("Codigo en contenedor:")
print(result if result else "(vacio - posible ruta incorrecta)")

# Confirmar la ruta del archivo
_, out2, _ = client.exec_command(
    "docker exec hotspot_app ls /app/src/controllers/",
    timeout=10
)
out2.channel.recv_exit_status()
print("\nArchivos en /app/src/controllers/:")
print(out2.read().decode())

# Ver el compose setup del contenedor
_, out3, _ = client.exec_command(
    "docker inspect hotspot_app --format '{{range .Mounts}}{{.Source}}:{{.Destination}} {{end}}'",
    timeout=10
)
out3.channel.recv_exit_status()
print("\nMounts del contenedor:")
print(out3.read().decode())

client.close()

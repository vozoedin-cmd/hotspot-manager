import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=10)

# Buscar strings especificos en el archivo del contenedor
for keyword in ['rowCount', 'setDevice', 'device_id', 'QueryTypes', 'sequelize.query']:
    _, out, _ = client.exec_command(
        f"docker exec hotspot_app grep -n '{keyword}' /app/src/controllers/sellerController.js 2>&1",
        timeout=10
    )
    out.channel.recv_exit_status()
    lines = out.read().decode().strip()
    if lines:
        print(f"[{keyword}]:")
        print(lines[:300])
    else:
        print(f"[{keyword}]: NO ENCONTRADO")
    print()

client.close()

import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=30)
_, out, _ = ssh.exec_command('docker logs --tail 40 hotspot_app 2>&1')
print(out.read().decode(errors='replace'))
ssh.close()

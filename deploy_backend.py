import paramiko

host = '167.99.58.189'
user = 'root'
pwd = '1998humber-C1d'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=pwd, timeout=30)
sftp = ssh.open_sftp()
print('Connected')

files = [
    (r'backend\src\controllers\reportController.js', '/opt/hotspot/backend/src/controllers/reportController.js'),
    (r'backend\src\routes\reports.js', '/opt/hotspot/backend/src/routes/reports.js'),
]
for local, remote in files:
    sftp.put(local, remote)
    print('Uploaded:', remote)

stdin, stdout, stderr = ssh.exec_command('docker restart hotspot_app')
exit_code = stdout.channel.recv_exit_status()
out = stdout.read().decode(errors='replace').strip()
print('Restart hotspot_app:', out, '| exit:', exit_code)

sftp.close()
ssh.close()
print('DONE')

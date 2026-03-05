import paramiko
import os

host = '167.99.58.189'
user = 'root'
pwd = '1998humber-C1d'
local_dist = r'c:\Users\Dell\Desktop\fdfgrfg\frontend\dist'
remote_dist = '/opt/hotspot/frontend/dist'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=pwd, timeout=30)
print('Connected')

sftp = ssh.open_sftp()

def ensure_dir(path):
    try:
        sftp.stat(path)
    except FileNotFoundError:
        sftp.mkdir(path)

def upload_dir(local, remote):
    ensure_dir(remote)
    for item in os.listdir(local):
        lpath = os.path.join(local, item)
        rpath = remote + '/' + item
        if os.path.isdir(lpath):
            upload_dir(lpath, rpath)
        else:
            sftp.put(lpath, rpath)

# Clean old dist (borrar CONTENIDO pero NO el directorio para no romper bind mount nginx)
stdin, stdout, stderr = ssh.exec_command(f'mkdir -p {remote_dist} && find {remote_dist} -mindepth 1 -delete')
stdout.channel.recv_exit_status()
print('Cleaned remote dist')

upload_dir(local_dist, remote_dist)
print('Upload complete')

# Restart nginx
stdin, stdout, stderr = ssh.exec_command('docker restart hotspot_nginx')
exit_code = stdout.channel.recv_exit_status()
out = stdout.read().decode(errors='replace').strip()
err = stderr.read().decode(errors='replace').strip()
print('Restart result:', out, '|', err, '| exit:', exit_code)

# Verify new files
stdin, stdout, stderr = ssh.exec_command('ls /opt/hotspot/frontend/dist/assets/')
print('Assets:', stdout.read().decode(errors='replace').strip())

sftp.close()
ssh.close()
print('DONE')

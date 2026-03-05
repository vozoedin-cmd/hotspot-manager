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
    (r'backend\src\config\validateEnv.js', '/opt/hotspot/backend/src/config/validateEnv.js'),
    (r'backend\src\index.js',              '/opt/hotspot/backend/src/index.js'),
]
for lpath, rpath in files:
    sftp.put(lpath, rpath)
    print('Uploaded:', rpath)

add_vars = [
    ('RATE_LIMIT_WINDOW_MS', '900000'),
    ('RATE_LIMIT_MAX',       '100'),
    ('LOG_LEVEL',            'info'),
    ('BACKUP_KEEP_DAYS',     '7'),
]
env_file = '/opt/hotspot/backend/.env'
for k, v in add_vars:
    cmd = f'grep -q "^{k}=" {env_file} || echo "{k}={v}" >> {env_file}'
    _, out, _ = ssh.exec_command(cmd)
    out.channel.recv_exit_status()
    print('  Ensured:', k)

_, out, _ = ssh.exec_command(f'cat {env_file}')
print('=== .env ===')
print(out.read().decode(errors='replace'))

# restart with separate session
chan = ssh.get_transport().open_session()
chan.exec_command('docker restart hotspot_app 2>&1')
chan.settimeout(60)
data = b''
while True:
    chunk = chan.recv(1024)
    if not chunk:
        break
    data += chunk
print('Restart:', data.decode(errors='replace').strip())
print('Exit code:', chan.recv_exit_status())

sftp.close()
ssh.close()
print('DONE')


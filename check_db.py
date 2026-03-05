import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('167.99.58.189', username='root', password='1998humber-C1d', timeout=20)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return (out + err).strip()

# Consultar nombres reales de servidores hotspot en SAQCHAJ via API RouterOS
node_script = """
const mikrotikService = require('./src/services/mikrotikService');
async function main() {
  const device = { host: '45.5.118.225', port: 8730, username: 'admin', password: 'CHINAHA1', use_ssl: false };
  try {
    const conn = await mikrotikService.getConnection(device);
    const servers = await conn.write(['/ip/hotspot/print']);
    console.log('SERVERS:', JSON.stringify(servers.map(s => s.name)));
    conn.close();
  } catch(e) { console.log('ERROR_SERVERS:', e.message); }
}
main();
"""
print("=== SERVIDORES HOTSPOT REALES EN SAQCHAJ ===")
print(run(f"docker exec hotspot_app node -e '{node_script}' 2>&1"))

client.close()

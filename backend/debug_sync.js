const { MikrotikDevice, Voucher } = require('./src/models');
const mikrotikService = require('./src/services/mikrotikService');
const { Op } = require('sequelize');

async function debug() {
  const device = await MikrotikDevice.findByPk('94b3aa38-e88e-4a31-afb3-11d41517f954');
  console.log('=== DEVICE ===');
  console.log(`Name: ${device.name} | Host: ${device.host} | Status: ${device.status}`);

  try {
    const activeUsers = await mikrotikService.getActiveHotspotUsers(device);
    console.log('\n=== ACTIVE HOTSPOT USERS (sesiones en vivo) ===');
    console.log('Total:', activeUsers.length);
    activeUsers.forEach(u => console.log(`  User: ${u.user} | Uptime: ${u.uptime} | IP: ${u.address}`));

    const allUsers = await mikrotikService.getHotspotUsers(device);
    console.log('\n=== ALL HOTSPOT USERS (registrados) ===');
    console.log('Total:', allUsers.length);
    
    // Check our 3 vouchers
    const codes = ['332268', '847757', '327333'];
    for (const code of codes) {
      const mtUser = allUsers.find(u => u.name === code);
      const isActive = activeUsers.find(u => u.user === code);
      console.log(`\n  Code: ${code}`);
      console.log(`    Exists in MikroTik users: ${!!mtUser}`);
      console.log(`    Is active session: ${!!isActive}`);
      if (mtUser) console.log(`    Disabled: ${mtUser.disabled} | Profile: ${mtUser.profile}`);
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  }

  process.exit(0);
}

debug().catch(e => { console.error(e); process.exit(1); });

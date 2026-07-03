const {Voucher} = require('./src/models');

async function check() {
  const actives = await Voucher.findAll({ where: { status: 'active' } });
  console.log('=== FICHAS ACTIVAS EN BD ===');
  console.log('Total:', actives.length);
  actives.forEach(v => {
    console.log(`Code: ${v.code} | DeviceID: ${v.device_id} | ActivatedAt: ${v.activated_at} | Status: ${v.status}`);
  });
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });

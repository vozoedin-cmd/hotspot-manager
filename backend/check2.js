const { Voucher } = require('./src/models');
async function check() {
  const actives = await Voucher.findAll({ where: { status: 'active' } });
  console.log('Active vouchers:', actives.length);
  actives.forEach(v => console.log(v.code, v.device_id, v.activated_at));
  process.exit(0);
}
check();

const { MikrotikDevice, Voucher } = require('./src/models');
async function run() {
  const devs = await MikrotikDevice.findAll();
  console.log('Devices:');
  devs.forEach(d => console.log(d.id, d.name, d.is_active));
  
  const v = await Voucher.findOne({ where: { code: '239927' } });
  if (v) {
    console.log('Voucher 239927:', v.id, v.device_id, v.status);
  } else {
    console.log('Voucher not found');
  }
  process.exit();
}
run();

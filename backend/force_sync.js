const syncService = require('./src/services/syncService');
const { MikrotikDevice } = require('./src/models');

async function forceSync() {
  console.log('Forcing sync...');
  try {
    const devices = await MikrotikDevice.findAll({ where: { is_active: true } });
    for (const device of devices) {
      console.log(`Syncing device: ${device.name}...`);
      const changes = await syncService.syncDevice(device);
      console.log(`Changes for ${device.name}:`, changes);
    }
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}

forceSync();

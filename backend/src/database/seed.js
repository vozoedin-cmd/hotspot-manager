require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../config/database');
const { User, SellerBalance, Package } = require('../models');
const logger = require('../config/logger');

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false });
    console.log('Conexión a base de datos establecida');

    // ---- Admin inicial ----
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hotspot.com';
    let admin = await User.findOne({ where: { email: adminEmail } });

    if (!admin) {
      admin = await User.create({
        name: process.env.ADMIN_NAME || 'Administrador',
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'Admin@12345!',
        role: 'admin',
        is_active: true,
      });
      console.log(`✅ Admin creado: ${adminEmail}`);
    } else {
      console.log(`⏭  Admin ya existe: ${adminEmail}`);
    }

    // ---- Vendedor de prueba ----
    let seller = await User.findOne({ where: { email: 'vendedor@hotspot.com' } });
    if (!seller) {
      seller = await User.create({
        name: 'Vendedor Demo',
        email: 'vendedor@hotspot.com',
        password: 'Vendedor@123!',
        role: 'seller',
        phone: '5555-1234',
        is_active: true,
      });

      await SellerBalance.create({
        seller_id: seller.id,
        balance: 500.00,
        monthly_limit: 2000.00,
      });
      console.log('✅ Vendedor demo creado: vendedor@hotspot.com');
    }

    // ---- Paquetes de ejemplo ----
    const packages = [
      {
        name: '30 Minutos',
        duration_value: 30,
        duration_unit: 'minutes',
        price: 3.00,
        cost: 2.00,
        speed_download: '2M',
        speed_upload: '1M',
        mikrotik_profile: '30min',
        color: '#10B981',
      },
      {
        name: '1 Hora',
        duration_value: 1,
        duration_unit: 'hours',
        price: 5.00,
        cost: 3.50,
        speed_download: '3M',
        speed_upload: '1M',
        mikrotik_profile: '1hora',
        color: '#3B82F6',
      },
      {
        name: '3 Horas',
        duration_value: 3,
        duration_unit: 'hours',
        price: 10.00,
        cost: 7.00,
        speed_download: '3M',
        speed_upload: '1M',
        mikrotik_profile: '3horas',
        color: '#8B5CF6',
      },
      {
        name: '1 Día',
        duration_value: 1,
        duration_unit: 'days',
        price: 20.00,
        cost: 15.00,
        speed_download: '5M',
        speed_upload: '2M',
        mikrotik_profile: '1dia',
        color: '#F59E0B',
      },
      {
        name: '7 Días',
        duration_value: 7,
        duration_unit: 'days',
        price: 100.00,
        cost: 70.00,
        speed_download: '5M',
        speed_upload: '2M',
        mikrotik_profile: '7dias',
        color: '#EF4444',
      },
      {
        name: '30 Días',
        duration_value: 30,
        duration_unit: 'days',
        price: 350.00,
        cost: 250.00,
        speed_download: '10M',
        speed_upload: '3M',
        mikrotik_profile: '30dias',
        color: '#EC4899',
      },
    ];

    for (const pkg of packages) {
      const existing = await Package.findOne({ where: { name: pkg.name } });
      if (!existing) {
        await Package.create(pkg);
        console.log(`✅ Paquete creado: ${pkg.name}`);
      } else {
        console.log(`⏭  Paquete ya existe: ${pkg.name}`);
      }
    }

    console.log('\n🎉 Seed completado exitosamente');
    console.log('─────────────────────────────────');
    console.log(`Admin:    ${adminEmail} / ${process.env.ADMIN_PASSWORD || 'Admin@12345!'}`);
    console.log('Vendedor: vendedor@hotspot.com / Vendedor@123!');
    console.log('─────────────────────────────────');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

seed();

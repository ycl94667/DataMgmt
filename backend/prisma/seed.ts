import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ==================== Categories ====================
  const categories = [
    { id: 1, name: '公务员', sortOrder: 1 },
    { id: 2, name: '事业单位', sortOrder: 2 },
    { id: 3, name: '国会', sortOrder: 3 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: BigInt(cat.id) },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: {
        id: BigInt(cat.id),
        name: cat.name,
        sortOrder: cat.sortOrder,
      },
    });
    console.log(`  Category: ${cat.name}`);
  }

  // ==================== Super Admin ====================
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      realName: '系统管理员',
      role: 'super_admin',
    },
    create: {
      username: 'admin',
      passwordHash,
      realName: '系统管理员',
      role: 'super_admin',
      isEnabled: 1,
    },
  });
  console.log('  Admin: admin (super_admin)');

  // ==================== Regions ====================
  // 贵州省
  const guizhou = await prisma.region.upsert({
    where: { id: BigInt(1) },
    update: { name: '贵州省', level: 1, parentId: BigInt(0), sortOrder: 1 },
    create: {
      id: BigInt(1),
      name: '贵州省',
      level: 1,
      parentId: BigInt(0),
      sortOrder: 1,
    },
  });
  console.log(`  Region: 贵州省 (id=${guizhou.id})`);

  // 六盘水市
  const liupanshui = await prisma.region.upsert({
    where: { id: BigInt(2) },
    update: { name: '六盘水市', level: 2, parentId: guizhou.id, sortOrder: 1 },
    create: {
      id: BigInt(2),
      name: '六盘水市',
      level: 2,
      parentId: guizhou.id,
      sortOrder: 1,
    },
  });
  console.log(`  Region: 六盘水市 (id=${liupanshui.id})`);

  // 钟山区
  const zhongshan = await prisma.region.upsert({
    where: { id: BigInt(3) },
    update: { name: '钟山区', level: 3, parentId: liupanshui.id, sortOrder: 1 },
    create: {
      id: BigInt(3),
      name: '钟山区',
      level: 3,
      parentId: liupanshui.id,
      sortOrder: 1,
    },
  });
  console.log(`  Region: 钟山区 (id=${zhongshan.id})`);

  // 水城区
  const shuicheng = await prisma.region.upsert({
    where: { id: BigInt(4) },
    update: { name: '水城区', level: 3, parentId: liupanshui.id, sortOrder: 2 },
    create: {
      id: BigInt(4),
      name: '水城区',
      level: 3,
      parentId: liupanshui.id,
      sortOrder: 2,
    },
  });
  console.log(`  Region: 水城区 (id=${shuicheng.id})`);

  // 贵阳市
  const guiyang = await prisma.region.upsert({
    where: { id: BigInt(5) },
    update: { name: '贵阳市', level: 2, parentId: guizhou.id, sortOrder: 2 },
    create: {
      id: BigInt(5),
      name: '贵阳市',
      level: 2,
      parentId: guizhou.id,
      sortOrder: 2,
    },
  });
  console.log(`  Region: 贵阳市 (id=${guiyang.id})`);

  // 南明区
  const nanming = await prisma.region.upsert({
    where: { id: BigInt(6) },
    update: { name: '南明区', level: 3, parentId: guiyang.id, sortOrder: 1 },
    create: {
      id: BigInt(6),
      name: '南明区',
      level: 3,
      parentId: guiyang.id,
      sortOrder: 1,
    },
  });
  console.log(`  Region: 南明区 (id=${nanming.id})`);

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

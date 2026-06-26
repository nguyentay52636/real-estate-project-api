import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import CrmKnowledge from '../models/CrmKnowledge.js';

/**
 * Seed mẫu CrmKnowledge vào MongoDB.
 * Dữ liệu sẽ xuất hiện tại GET /api/crm-knowledge-catalog — AI đọc API đó để tư vấn.
 *
 * Run: npm run seed:crm
 */

const SAMPLES = [
  {
    tieuDe: 'Căn 2PN Quận 2 view sông',
    moTa: 'Căn hộ cao cấp full nội thất, view sông đẹp, gần Metro, an ninh 24/7',
    gia: 12000000,
    diaChi: '123 Nguyễn Văn Linh',
    quanHuyen: 'Quận 2',
    phongNgu: 2,
    dienTich: 65,
    loaiBds: 'can_ho',
    anhUrls: [],
    url: 'http://localhost:5173/products/can-ho-vinhomes-can-gio',
    trangThai: 'active',
  },
  {
    tieuDe: 'Studio Quận 1 trung tâm',
    moTa: 'Studio tiện nghi, phù hợp đi làm, gần chợ Bến Thành',
    gia: 8500000,
    diaChi: '45 Lê Lợi',
    quanHuyen: 'Quận 1',
    phongNgu: 1,
    dienTich: 35,
    loaiBds: 'studio',
    anhUrls: [],
    url: 'http://localhost:5173/products/studio-quan-1-trung-tam',
    trangThai: 'active',
  },
];

async function main() {
  await mongoose.connect(process.env.DB_URL);
  const existing = await CrmKnowledge.countDocuments({ trangThai: 'active' });
  console.log(`CRM active hiện có: ${existing} bài`);

  let created = 0;
  for (const doc of SAMPLES) {
    const found = await CrmKnowledge.findOne({ tieuDe: doc.tieuDe });
    if (found) {
      await CrmKnowledge.findByIdAndUpdate(found._id, doc);
      console.log(`  Cập nhật: ${doc.tieuDe}`);
      continue;
    }
    await CrmKnowledge.create(doc);
    created += 1;
    console.log(`  + Tạo: ${doc.tieuDe}`);
  }

  const total = await CrmKnowledge.countDocuments({ trangThai: 'active' });
  const base = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 8000}`).replace(/\/$/, '');

  console.log(`\nHoàn tất. Thêm ${created} bài. Tổng active: ${total}`);
  console.log(`Kiểm tra catalog API: curl ${base}/api/crm-knowledge-catalog`);
  console.log('Thử chat: "căn 2 phòng Quận 2" hoặc "studio Quận 1"');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

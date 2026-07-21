import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Property from '#models/Property.js';
import { getDefaultCoordinates } from '#shared/utils/geoUtils.js';

/**
 * Script Migration: Gán tọa độ toaDo mặc định cho các bài đăng cũ chưa có toaDo
 * Run: npm run seed:coordinates
 */

async function main() {
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    console.error('Lỗi: Thiếu DB_URL trong file .env');
    process.exit(1);
  }

  console.log('Kết nối CSDL MongoDB...');
  await mongoose.connect(dbUrl);

  const query = {
    $or: [
      { toaDo: { $exists: false } },
      { toaDo: null },
      { 'toaDo.lat': null },
      { 'toaDo.lng': null },
      { 'toaDo.lat': { $exists: false } },
    ],
  };

  const totalOldPosts = await Property.countDocuments(query);
  console.log(`Tìm thấy ${totalOldPosts} bài đăng chưa có hoặc thiếu thông tin toaDo.`);

  if (totalOldPosts === 0) {
    console.log('Tất cả các bài đăng đã có toaDo đầy đủ. Kết thúc script.');
    await mongoose.disconnect();
    return;
  }

  const postsToUpdate = await Property.find(query);
  let updatedCount = 0;

  for (const post of postsToUpdate) {
    const coords = getDefaultCoordinates(post.quanHuyen, post.tinhThanh);
    await Property.findByIdAndUpdate(post._id, { toaDo: coords });
    updatedCount++;
    console.log(`  [${updatedCount}/${totalOldPosts}] Đã cập nhật toaDo cho "${post.tieuDe}" (${post.quanHuyen}, ${post.tinhThanh}) -> lat: ${coords.lat}, lng: ${coords.lng}`);
  }

  console.log(`\nHoàn tất migration! Đã cập nhật ${updatedCount} bài đăng.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Lỗi khi chạy migration seedCoordinates:', err.message);
  process.exit(1);
});

import '#config/env.js';
import dns from 'dns';
import mongoose from 'mongoose';

// Fix: Windows DNS mặc định không resolve SRV record của MongoDB Atlas
// Dùng Google DNS (8.8.8.8) thay thế
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  const uri = process.env.DB_URL;
  if (!uri) {
    console.error('Kết nối MongoDB thất bại: thiếu DB_URL trong .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`Đã kết nối MongoDB (${mongoose.connection.name || 'default'})`);
  } catch (err) {
    console.error('Kết nối MongoDB thất bại:', err.message);
    if (String(err.message).includes('ECONNREFUSED') || err.reason?.type === 'ReplicaSetNoPrimary') {
      console.error('Gợi ý: Cluster Atlas có thể đang Paused / offline. Resume trên Atlas, hoặc dùng Mongo local (Docker).');
    }
    process.exit(1);
  }
};

export default connectDB;

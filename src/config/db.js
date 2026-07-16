import '#config/env.js';
import mongoose from 'mongoose';

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

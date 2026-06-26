import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

 // nếu dùng biến môi trường ở đây

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Đã kết nối MongoDB');
  } catch (err) {
    console.error('Kết nối MongoDB thất bại:', err.message);
    process.exit(1); // Dừng server nếu lỗi DB
  }
};

export default connectDB;

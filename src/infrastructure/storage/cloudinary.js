import { v2 as cloudinary } from 'cloudinary';

const REQUIRED_VARS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

function getMissingEnvVars() {
  return REQUIRED_VARS.filter((key) => !process.env[key]);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function verifyCloudinaryConnection() {
  const missing = getMissingEnvVars();
  if (missing.length) {
    return { ok: false, message: `Thiếu biến môi trường: ${missing.join(', ')}` };
  }

  try {
    await cloudinary.api.ping();
    return { ok: true };
  } catch (error) {
    const raw = error?.error?.message || error?.message || 'Không kết nối được Cloudinary';
    // cloud_name mismatch = cloud_name không khớp API key/secret trên dashboard
    const message =
      /cloud_name mismatch/i.test(raw)
        ? 'Cloudinary cloud_name không khớp API key/secret — kiểm tra lại CLOUDINARY_* trong .env (Dashboard → API Keys)'
        : raw;
    return { ok: false, message };
  }
}

cloudinary.getMissingEnvVars = getMissingEnvVars;
cloudinary.verifyConnection = verifyCloudinaryConnection;

export default cloudinary;

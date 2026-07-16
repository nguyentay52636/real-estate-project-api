import cloudinary from '#infra/storage/cloudinary.js';

function extractPublicId(url) {
  if (!url?.includes('res.cloudinary.com')) return null;

  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1 || parts.length <= uploadIndex + 2) return null;

  const fileWithExt = parts[parts.length - 1];
  return parts
    .slice(uploadIndex + 2, parts.length - 1)
    .concat(fileWithExt.split('.')[0])
    .join('/');
}

function uploadFromBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    stream.end(buffer);
  });
}

async function destroyByUrl(url) {
  const publicId = extractPublicId(url);
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId);
}

export { extractPublicId, uploadFromBuffer, destroyByUrl };
export default { extractPublicId, uploadFromBuffer, destroyByUrl };
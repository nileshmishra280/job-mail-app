const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file to Cloudinary
 * @param {string} filePath - Local path of the file to upload
 * @param {string} publicId - Optional public ID for the file
 * @returns {Promise<object>} - Cloudinary upload result
 */
const uploadFile = async (filePath, publicId = null) => {
  try {
    const options = {
      resource_type: 'raw', // For PDFs and non-image files
      folder: 'resumes',
    };

    if (publicId) {
      options.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(filePath, options);
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      name: result.original_filename,
      id: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw new Error('Failed to upload to Cloudinary: ' + error.message);
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public ID of the file to delete
 * @returns {Promise<object>} - Cloudinary deletion result
 */
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });
    return { success: result.result === 'ok', result };
  } catch (error) {
    console.error('Cloudinary Delete Error:', error);
    throw new Error('Failed to delete from Cloudinary: ' + error.message);
  }
};

/**
 * Check if Cloudinary is configured with real credentials
 * @returns {boolean}
 */
const isConfigured = () => {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== 'your_key' &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'your_secret'
  );
};

module.exports = { uploadFile, deleteFile, isConfigured };
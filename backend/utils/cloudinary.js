const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage for NAP reports (PDFs)
const napReportStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'crm/nap-reports',
    allowed_formats: ['pdf'],
    resource_type: 'raw', // For non-image files like PDFs
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      return `nap-report-${uniqueSuffix}`;
    }
  }
});

// Cloudinary storage for resumes
const resumeStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'crm/resumes',
    allowed_formats: ['pdf', 'doc', 'docx'],
    resource_type: 'raw', // For non-image files
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      return `resume-${uniqueSuffix}`;
    }
  }
});

// Multer upload configurations
const napReportUpload = multer({
  storage: napReportStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowed = /pdf/;
    const extname = allowed.test(file.originalname.toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDF files are allowed'));
  }
});

const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

// Helper functions
const uploadToCloudinary = async (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'raw',
      ...options
    };
    
    cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    }).end(buffer);
  });
};

const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Extract public ID from Cloudinary URL
const extractPublicId = (url) => {
  if (!url) return null;
  
  // Extract public ID from Cloudinary URL
  const matches = url.match(/\/v\d+\/(.+)\./);
  return matches ? matches[1] : null;
};

module.exports = {
  cloudinary,
  napReportUpload,
  resumeUpload,
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId
};

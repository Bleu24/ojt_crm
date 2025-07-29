const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const streamifier = require('streamifier');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Custom Cloudinary storage engine for multer
class CloudinaryStorage {
  constructor(options) {
    this.options = options;
  }

  _handleFile(req, file, cb) {
    const uploadOptions = {
      folder: this.options.params.folder,
      resource_type: this.options.params.resource_type || 'raw',
      public_id: this.options.params.public_id ? this.options.params.public_id(req, file) : undefined,
      allowed_formats: this.options.params.allowed_formats
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          cb(error);
        } else {
          cb(null, {
            path: result.secure_url,
            filename: result.public_id,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: result.bytes
          });
        }
      }
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  }

  _removeFile(req, file, cb) {
    cloudinary.uploader.destroy(file.filename, { resource_type: 'raw' }, cb);
  }
}

// Cloudinary storage for NAP reports (PDFs)
const napReportStorage = new CloudinaryStorage({
  params: {
    folder: 'crm/nap-reports',
    allowed_formats: ['pdf'],
    resource_type: 'raw',
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      return `nap-report-${uniqueSuffix}`;
    }
  }
});

// Cloudinary storage for resumes
const resumeStorage = new CloudinaryStorage({
  params: {
    folder: 'crm/resumes',
    allowed_formats: ['pdf', 'doc', 'docx'],
    resource_type: 'raw',
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      return `resume-${uniqueSuffix}`;
    }
  }
});

// Multer upload configurations with memory storage (required for custom storage)
const napReportUpload = multer({
  storage: multer.memoryStorage(),
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
  storage: multer.memoryStorage(),
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

// Custom middleware to handle Cloudinary upload after multer
const uploadToCloudinary = (folder, resourceType = 'raw') => {
  return async (req, res, next) => {
    if (!req.file) {
      return next();
    }

    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const publicId = folder === 'crm/nap-reports' 
        ? `nap-report-${uniqueSuffix}`
        : `resume-${uniqueSuffix}`;

      const uploadOptions = {
        folder: folder,
        public_id: publicId,
        resource_type: resourceType
      };

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });

      // Update req.file with Cloudinary info
      req.file.path = result.secure_url;
      req.file.filename = result.public_id;
      req.file.cloudinary = result;

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper functions
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

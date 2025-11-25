const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { S3Service } = require('../config/s3');
const router = express.Router();

// Configure multer to use memory storage for S3 uploads
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimeTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
    // Videos
    'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo', 'video/webm',
    // Audio
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/m4a', 'audio/ogg',
    // Documents
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'application/json', 'text/plain'
  ];

  // Allowed extensions
  const allowedExtensions = /\.(jpeg|jpg|png|gif|webp|bmp|mp4|avi|mov|mp3|wav|aac|m4a|ogg|pdf|doc|docx|xls|xlsx|csv|json|txt)$/i;

  const extMatch = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeMatch = allowedMimeTypes.includes(file.mimetype.toLowerCase());

  console.log(`📎 File filter check: ${file.originalname}, mime: ${file.mimetype}, extMatch: ${extMatch}, mimeMatch: ${mimeMatch}`);

  if (extMatch || mimeMatch) {
    cb(null, true);
  } else {
    console.error(`❌ Rejected file: ${file.originalname}, mime: ${file.mimetype}`);
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: images, videos, audio, documents.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
  }
});

// Multer error handler wrapper
const handleMulterError = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        return res.status(400).json({
          error: `Upload error: ${err.message}`,
          code: err.code
        });
      } else if (err) {
        console.error('Upload middleware error:', err);
        return res.status(500).json({
          error: err.message || 'File upload failed'
        });
      }
      next();
    });
  };
};

// Single file upload to S3
router.post('/single', authenticateToken, handleMulterError(upload.single('file')), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📤 Uploading file to S3: ${req.file.originalname}`);
    console.log(`📊 File details:`, {
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname
    });
    
    // Determine folder based on file type and project
    const fileType = req.body.fileType || _getFileType(req.file.mimetype);
    const projectId = req.body.projectId;
    const folder = S3Service.getFolderPath(fileType, projectId);
    
    console.log(`📁 Upload folder: ${folder}`);
    
    // Upload to S3
    const uploadResult = await S3Service.uploadFile(req.file, folder);
    
    if (!uploadResult.success) {
      console.error('❌ Upload failed:', uploadResult.error);
      return res.status(500).json({ 
        error: uploadResult.error,
        details: 'S3 upload failed. Check server logs for details.'
      });
    }

    console.log(`✅ File uploaded successfully: ${uploadResult.url}`);

    res.json({
      message: uploadResult.isFallback ? 'File uploaded with fallback storage' : 'File uploaded successfully to S3',
      url: uploadResult.url,
      key: uploadResult.key,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      fileType: fileType,
      bucket: uploadResult.bucket,
      isFallback: uploadResult.isFallback || false
    });
  } catch (error) {
    console.error('❌ Upload route error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      details: 'Internal server error during file upload'
    });
  }
});

// Multiple files upload to S3
router.post('/multiple', authenticateToken, handleMulterError(upload.array('files', 10)), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`📤 Uploading ${req.files.length} files to S3`);
    
    // Determine folder based on file type and project
    const fileType = req.body.fileType || 'general';
    const projectId = req.body.projectId;
    const folder = S3Service.getFolderPath(fileType, projectId);
    
    // Upload all files to S3
    const uploadResult = await S3Service.uploadMultipleFiles(req.files, folder);
    
    if (!uploadResult.success) {
      return res.status(500).json({ error: uploadResult.error });
    }

    console.log(`✅ ${uploadResult.successful.length} files uploaded to S3`);

    res.json({
      message: 'Files uploaded successfully to S3',
      files: uploadResult.successful.map(result => ({
        url: result.url,
        key: result.key,
        originalName: req.files.find(f => f.buffer === result.file?.buffer)?.originalname,
        bucket: result.bucket
      })),
      successful: uploadResult.successful.length,
      failed: uploadResult.failed.length,
      totalFiles: uploadResult.totalFiles
    });
  } catch (error) {
    console.error('❌ S3 multiple upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file from S3
router.delete('/:key(*)', authenticateToken, async (req, res) => {
  try {
    const key = req.params.key;
    console.log(`🗑️ Deleting file from S3: ${key}`);
    
    const deleteResult = await S3Service.deleteFile(key);
    
    if (!deleteResult.success) {
      return res.status(500).json({ error: deleteResult.error });
    }

    console.log(`✅ File deleted from S3: ${key}`);
    res.json({ message: 'File deleted successfully from S3' });
  } catch (error) {
    console.error('❌ S3 delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get file info from S3
router.get('/info/:key(*)', authenticateToken, async (req, res) => {
  try {
    const key = req.params.key;
    const fileInfo = await S3Service.getFileInfo(key);
    
    if (!fileInfo.success) {
      return res.status(404).json({ error: fileInfo.error });
    }

    res.json(fileInfo.info);
  } catch (error) {
    console.error('❌ S3 file info error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List files in folder
router.get('/list/:folder(*)', authenticateToken, async (req, res) => {
  try {
    const folder = req.params.folder || 'uploads';
    const listResult = await S3Service.listFiles(folder);
    
    if (!listResult.success) {
      return res.status(500).json({ error: listResult.error });
    }

    res.json({
      folder: folder,
      files: listResult.files,
      count: listResult.files.length
    });
  } catch (error) {
    console.error('❌ S3 list files error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test S3 connection endpoint
router.get('/test-s3', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Testing S3 connection...');
    const testResult = await S3Service.testConnection();
    
    if (testResult.success) {
      res.json({
        success: true,
        message: 'S3 connection successful',
        bucket: 'agrimodel-bucket',
        region: 'us-west-2'
      });
    } else {
      res.status(500).json({
        success: false,
        error: testResult.error,
        message: 'S3 connection failed'
      });
    }
  } catch (error) {
    console.error('❌ S3 test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'S3 test failed'
    });
  }
});

// Helper function to determine file type from MIME type
function _getFileType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text')) return 'document';
  return 'attachment';
}

module.exports = router;


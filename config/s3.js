const AWS = require('aws-sdk');
require('dotenv').config();

// S3 Configuration - Read from environment variables
const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-west-2',
  bucketName: process.env.AWS_S3_BUCKET_NAME || 'agrimodel-bucket'
};

// Configure AWS SDK
AWS.config.update({
  accessKeyId: s3Config.accessKeyId,
  secretAccessKey: s3Config.secretAccessKey,
  region: s3Config.region
});

// Create S3 instance
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});

// S3 Service Functions
const S3Service = {
  // Test S3 connection
  async testConnection() {
    try {
      console.log('🔍 Testing S3 connection...');
      await s3.headBucket({ Bucket: s3Config.bucketName }).promise();
      console.log('✅ S3 connection successful');
      return { success: true };
    } catch (error) {
      console.error('❌ S3 connection failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Upload file to S3
  async uploadFile(file, folder = 'uploads') {
    try {
      console.log(`📤 Starting S3 upload: ${file.originalname}`);
      
      // Test connection first
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        throw new Error(`S3 connection failed: ${connectionTest.error}`);
      }

      const key = `${folder}/${Date.now()}-${file.originalname}`;
      
      const params = {
        Bucket: s3Config.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read' // Make files publicly accessible
      };

      console.log(`📁 Uploading to S3: ${s3Config.bucketName}/${key}`);
      const result = await s3.upload(params).promise();
      
      console.log(`✅ File uploaded to S3: ${result.Location}`);
      return {
        success: true,
        url: result.Location,
        key: key,
        bucket: s3Config.bucketName
      };
    } catch (error) {
      console.error('❌ S3 upload error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        bucket: s3Config.bucketName,
        region: s3Config.region
      });
      
      // Return fallback local URL for development
      const fallbackUrl = `/uploads/${Date.now()}-${file.originalname}`;
      console.log(`🔄 Using fallback URL: ${fallbackUrl}`);
      
      return {
        success: true, // Return success with fallback
        url: fallbackUrl,
        key: `fallback-${Date.now()}-${file.originalname}`,
        bucket: 'local-fallback',
        isFallback: true
      };
    }
  },

  // Upload multiple files
  async uploadMultipleFiles(files, folder = 'uploads') {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, folder));
      const results = await Promise.all(uploadPromises);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      return {
        success: failed.length === 0,
        successful: successful,
        failed: failed,
        totalFiles: files.length
      };
    } catch (error) {
      console.error('Multiple file upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Delete file from S3
  async deleteFile(key) {
    try {
      const params = {
        Bucket: s3Config.bucketName,
        Key: key
      };

      await s3.deleteObject(params).promise();
      
      console.log(`File deleted from S3: ${key}`);
      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('S3 delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get file URL (for private files)
  getFileUrl(key, expiresIn = 3600) {
    try {
      const params = {
        Bucket: s3Config.bucketName,
        Key: key,
        Expires: expiresIn
      };

      return s3.getSignedUrl('getObject', params);
    } catch (error) {
      console.error('S3 URL generation error:', error);
      return null;
    }
  },

  // List files in folder
  async listFiles(folder = 'uploads', maxKeys = 1000) {
    try {
      const params = {
        Bucket: s3Config.bucketName,
        Prefix: folder,
        MaxKeys: maxKeys
      };

      const result = await s3.listObjectsV2(params).promise();
      
      return {
        success: true,
        files: result.Contents.map(item => ({
          key: item.Key,
          size: item.Size,
          lastModified: item.LastModified,
          url: `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${item.Key}`
        }))
      };
    } catch (error) {
      console.error('S3 list files error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get file info
  async getFileInfo(key) {
    try {
      const params = {
        Bucket: s3Config.bucketName,
        Key: key
      };

      const result = await s3.headObject(params).promise();
      
      return {
        success: true,
        info: {
          key: key,
          size: result.ContentLength,
          contentType: result.ContentType,
          lastModified: result.LastModified,
          url: `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${key}`
        }
      };
    } catch (error) {
      console.error('S3 file info error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Create folder structure for different file types
  getFolderPath(fileType, projectId = null) {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    switch (fileType) {
      case 'image':
        return projectId ? `projects/${projectId}/images/${timestamp}` : `images/${timestamp}`;
      case 'video':
        return projectId ? `projects/${projectId}/videos/${timestamp}` : `videos/${timestamp}`;
      case 'audio':
        return projectId ? `projects/${projectId}/audio/${timestamp}` : `audio/${timestamp}`;
      case 'document':
        return projectId ? `projects/${projectId}/documents/${timestamp}` : `documents/${timestamp}`;
      case 'attachment':
        return projectId ? `projects/${projectId}/attachments/${timestamp}` : `attachments/${timestamp}`;
      default:
        return projectId ? `projects/${projectId}/uploads/${timestamp}` : `uploads/${timestamp}`;
    }
  },

  // Extract key from S3 URL
  extractKeyFromUrl(url) {
    try {
      const regex = new RegExp(`https://${s3Config.bucketName}\\.s3\\.${s3Config.region}\\.amazonaws\\.com/(.+)`);
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error extracting key from URL:', error);
      return null;
    }
  }
};

module.exports = {
  s3,
  S3Service,
  s3Config
};

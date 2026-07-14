const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const {
  analyzeJob, analyzeJobFromImage, sendJobMail, getHistory, clearHistory,
  getSettings, saveSettings, uploadResume, getResume, selectResume, deleteResume,
  uploadResumeCloudinary, deleteResumeCloudinary
} = require('../controllers/mainController');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer config for resume upload (PDF only)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `resume_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Multer config for JD image upload
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `jd_image_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for images
});

// Routes
router.post('/analyze', analyzeJob);
router.post('/analyze-image', imageUpload.single('jdImage'), analyzeJobFromImage);
router.post('/send-mail', sendJobMail);
router.get('/history', getHistory);
router.delete('/history', clearHistory);
router.get('/settings', getSettings);
router.post('/settings', saveSettings);
router.post('/resume/upload', upload.single('resume'), uploadResume);
router.get('/resume', getResume);
router.post('/resume/select', selectResume);
router.delete('/resume', deleteResume);

// Cloudinary routes
router.post('/resume/cloudinary-upload', upload.single('resume'), uploadResumeCloudinary);
router.delete('/resume/cloudinary/:publicId', deleteResumeCloudinary);

module.exports = router;
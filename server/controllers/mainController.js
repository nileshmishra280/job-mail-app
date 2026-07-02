const path = require('path');
const { readJSON, writeJSON } = require('../utils/fileHelpers');
const { analyzeJobPost } = require('../services/geminiService');
const { sendMail } = require('../services/emailService');
const { uploadFile, deleteFile, isConfigured } = require('../services/cloudinaryService');

const analyzeJob = async (req, res) => {

  try {
    const { jobText } = req.body;
    if (!jobText || jobText.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a valid job description (min 10 characters).' });
    }
    //console.log('Analyzing job post:', jobText);
    const result = await analyzeJobPost(jobText);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendJobMail = async (req, res) => {
  try {
    const { to, subject, text, attachResume } = req.body;
    const { company, role } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, text' });
    }

    const result = await sendMail({ to, subject, text, attachResume });

    // Save to history
    const history = readJSON('history.json');
    history.unshift({
      id: Date.now().toString(),
      company: company || 'Unknown',
      role: role || 'Unknown',
      email: to,
      date: new Date().toISOString(),
      status: 'Sent'
    });
    writeJSON('history.json', history);

    res.json({ success: true, message: 'Email sent successfully!', messageId: result.messageId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getHistory = (req, res) => {
  try {
    const history = readJSON('history.json');
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
};

const clearHistory = (req, res) => {
  try {
    writeJSON('history.json', []);
    res.json({ success: true, message: 'History cleared.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history.' });
  }
};

const getSettings = (req, res) => {
  try {
    const settings = readJSON('settings.json');
    res.json({
      senderEmail: settings.senderEmail || '',
      appPassword: settings.appPassword ? '********' : '',
      geminiApiKey: settings.geminiApiKey ? '********' : ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
};

const saveSettings = (req, res) => {
  try {
    const { senderEmail, appPassword, geminiApiKey } = req.body;
    const currentSettings = readJSON('settings.json');

    if (senderEmail !== undefined) currentSettings.senderEmail = senderEmail;
    if (appPassword !== undefined && appPassword !== '********') currentSettings.appPassword = appPassword;
    if (geminiApiKey !== undefined && geminiApiKey !== '********') currentSettings.geminiApiKey = geminiApiKey;

    writeJSON('settings.json', currentSettings);

    res.json({
      success: true,
      message: 'Settings saved successfully!',
      settings: {
        senderEmail: currentSettings.senderEmail,
        appPassword: currentSettings.appPassword ? '********' : '',
        geminiApiKey: currentSettings.geminiApiKey ? '********' : ''
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings.' });
  }
};

const uploadResume = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }
    const templates = readJSON('templates.json');
    templates.resumePath = req.file.path;
    templates.selectedResumeSource = 'local';
    templates.selectedCloudinaryResumeId = null;
    writeJSON('templates.json', templates);
    res.json({ success: true, message: 'Resume uploaded successfully!', path: req.file.path });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload resume.' });
  }
};

const getResume = (req, res) => {
  try {
    const templates = readJSON('templates.json');
    res.json({
      hasResume: Boolean(templates.resumePath),
      path: templates.resumePath || null,
      selectedResumeSource: templates.selectedResumeSource || 'local',
      selectedCloudinaryResumeId: templates.selectedCloudinaryResumeId || null,
      cloudinaryResumes: templates.cloudinaryResumes || []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resume info.' });
  }
};

const selectResume = (req, res) => {
  try {
    const { source, resumeId } = req.body;
    const templates = readJSON('templates.json');

    if (source === 'local') {
      if (!templates.resumePath) {
        return res.status(400).json({ error: 'No local resume is available to select.' });
      }
      templates.selectedResumeSource = 'local';
      templates.selectedCloudinaryResumeId = null;
      writeJSON('templates.json', templates);
      return res.json({ success: true, message: 'Local resume selected.', selectedResumeSource: 'local' });
    }

    if (source === 'cloudinary') {
      const selected = (templates.cloudinaryResumes || []).find((item) => item.id === resumeId);
      if (!selected) {
        return res.status(400).json({ error: 'Cloudinary resume not found.' });
      }
      templates.selectedResumeSource = 'cloudinary';
      templates.selectedCloudinaryResumeId = resumeId;
      writeJSON('templates.json', templates);
      return res.json({ success: true, message: 'Cloudinary resume selected.', selectedResumeSource: 'cloudinary', selectedCloudinaryResumeId: resumeId });
    }

    res.status(400).json({ error: 'Invalid resume source.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to select resume.' });
  }
};

const deleteResume = (req, res) => {
  try {
    const templates = readJSON('templates.json');
    if (templates.resumePath) {
      const fs = require('fs');
      try { fs.unlinkSync(templates.resumePath); } catch (e) { /* file may not exist */ }
      templates.resumePath = null;
    }
    if (templates.selectedResumeSource === 'local') {
      templates.selectedResumeSource = 'cloudinary';
      templates.selectedCloudinaryResumeId = templates.cloudinaryResumes?.[0]?.id || null;
    }
    writeJSON('templates.json', templates);
    res.json({ success: true, message: 'Resume removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove resume.' });
  }
};

// ============ Cloudinary ============

const uploadResumeCloudinary = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file.' });
    }

    if (!isConfigured()) {
      return res.status(400).json({
        error: 'Cloudinary is not configured. Please set your Cloudinary credentials in .env file.',
      });
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadFile(req.file.path);

    // Clean up local temp file
    const fs = require('fs');
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

    // Save to templates.json
    const templates = readJSON('templates.json');
    if (!templates.cloudinaryResumes) {
      templates.cloudinaryResumes = [];
    }

    // Add to list
    templates.cloudinaryResumes.push({
      id: cloudinaryResult.id,
      name: cloudinaryResult.name,
      url: cloudinaryResult.url,
      uploadedAt: new Date().toISOString(),
    });

    // Auto-select this resume
    templates.selectedCloudinaryResumeId = cloudinaryResult.id;

    writeJSON('templates.json', templates);

    res.json({
      success: true,
      message: 'Resume uploaded to Cloudinary successfully!',
      cloudinaryResult,
      cloudinaryResumes: templates.cloudinaryResumes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteResumeCloudinary = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required.' });
    }

    // Delete from Cloudinary
    await deleteFile(publicId);

    // Remove from templates.json
    const templates = readJSON('templates.json');
    templates.cloudinaryResumes = (templates.cloudinaryResumes || []).filter(
      (item) => item.id !== publicId
    );

    // If the deleted one was selected, switch to another or local
    if (templates.selectedCloudinaryResumeId === publicId) {
      const nextResume = templates.cloudinaryResumes?.[0];
      if (nextResume) {
        templates.selectedCloudinaryResumeId = nextResume.id;
      } else if (templates.resumePath) {
        templates.selectedResumeSource = 'local';
        templates.selectedCloudinaryResumeId = null;
      } else {
        templates.selectedCloudinaryResumeId = null;
      }
    }

    writeJSON('templates.json', templates);

    res.json({
      success: true,
      message: 'Cloudinary resume deleted.',
      cloudinaryResumes: templates.cloudinaryResumes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { analyzeJob, sendJobMail, getHistory, clearHistory, getSettings, saveSettings, uploadResume, getResume, selectResume, deleteResume, uploadResumeCloudinary, deleteResumeCloudinary };
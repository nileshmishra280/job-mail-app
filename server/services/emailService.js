const nodemailer = require('nodemailer');
const { readJSON } = require('../utils/fileHelpers');

const sendMail = async ({ to, subject, text, attachResume }) => {
  const settings = readJSON('settings.json');
  const templates = readJSON('templates.json');

  const senderEmail = settings.senderEmail || process.env.SENDER_EMAIL;
  const appPassword = settings.appPassword || process.env.APP_PASSWORD;

  if (!senderEmail || !appPassword) {
    throw new Error('Sender email or app password not configured. Please set them in Settings.');
  }

  if (!to || !subject || !text) {
    throw new Error('Missing required fields: to, subject, text');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: senderEmail,
      pass: appPassword,
    },
  });

  const mailOptions = {
    from: senderEmail,
    to,
    subject,
    text,
  };

  if (attachResume) {
    const selectedSource = templates.selectedResumeSource || 'local';
    if (selectedSource === 'local' && templates.resumePath) {
      mailOptions.attachments = [
        {
          filename: 'Resume.pdf',
          path: templates.resumePath,
        },
      ];
    } else if (selectedSource === 'cloudinary' && templates.selectedCloudinaryResumeId) {
      const selected = (templates.cloudinaryResumes || []).find(
        (item) => item.id === templates.selectedCloudinaryResumeId
      );
      if (selected && selected.url) {
        mailOptions.attachments = [
          {
            filename: `${selected.name}.pdf`,
            path: selected.url,
          },
        ];
      }
    }
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email Error:', error.message || error);
    throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
  }
};

module.exports = { sendMail };
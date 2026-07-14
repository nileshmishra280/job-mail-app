const { Resend } = require('resend');
const fs = require('fs');
const { readJSON } = require('../utils/fileHelpers');

const sendMail = async ({ to, subject, text, attachResume }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured. Add it to your environment variables.');
  }

  const templates = readJSON('templates.json');
  const resend = new Resend(apiKey);

  // From address — Resend requires a verified domain.
  // On the free plan you can send from onboarding@resend.dev to any address.
  // Once you verify your own domain, swap this to your real address.
  const from = process.env.SENDER_EMAIL
    ? `Nilesh Mishra <${process.env.SENDER_EMAIL}>`
    : 'Nilesh Mishra <onboarding@resend.dev>';

  const payload = {
    from,
    to: [to],
    subject,
    text,
  };

  // Attach resume if requested
  if (attachResume) {
    const selectedSource = templates.selectedResumeSource || 'local';

    if (selectedSource === 'local' && templates.resumePath) {
      try {
        const fileContent = fs.readFileSync(templates.resumePath);
        payload.attachments = [
          {
            filename: 'Resume.pdf',
            content: fileContent,
          },
        ];
      } catch (e) {
        console.warn('Could not read local resume for attachment:', e.message);
      }
    } else if (selectedSource === 'cloudinary' && templates.selectedCloudinaryResumeId) {
      const selected = (templates.cloudinaryResumes || []).find(
        (item) => item.id === templates.selectedCloudinaryResumeId
      );
      if (selected?.url) {
        payload.attachments = [
          {
            filename: `${selected.name}.pdf`,
            path: selected.url,
          },
        ];
      }
    }
  }

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    console.error('Resend error:', error);
    throw new Error(`Failed to send email: ${error.message || JSON.stringify(error)}`);
  }

  return { success: true, messageId: data.id };
};

module.exports = { sendMail };

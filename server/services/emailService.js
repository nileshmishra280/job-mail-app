const fs = require('fs');
const { readJSON } = require('../utils/fileHelpers');

const sendMail = async ({ to, subject, text, attachResume }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not configured. Add it to your environment variables.');
  }

  const templates = readJSON('templates.json');

  // Build payload for Brevo transactional email API
  const payload = {
    sender: { name: 'Nilesh Mishra', email: 'nileshmishra2508@gmail.com' },
    to: [{ email: to }],
    subject,
    textContent: text,
  };

  // Attach resume if requested
  if (attachResume) {
    const selectedSource = templates.selectedResumeSource || 'local';
    const attachments = [];

    if (selectedSource === 'local' && templates.resumePath) {
      try {
        const fileContent = fs.readFileSync(templates.resumePath);
        attachments.push({
          name: 'Resume.pdf',
          content: fileContent.toString('base64'),
        });
      } catch (e) {
        console.warn('Could not read local resume:', e.message);
      }
    } else if (selectedSource === 'cloudinary' && templates.selectedCloudinaryResumeId) {
      const selected = (templates.cloudinaryResumes || []).find(
        (item) => item.id === templates.selectedCloudinaryResumeId
      );
      if (selected?.url) {
        attachments.push({ url: selected.url, name: `${selected.name}.pdf` });
      }
    }

    if (attachments.length > 0) payload.attachment = attachments;
  }

  // Call Brevo REST API directly (no domain verification needed)
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Brevo error:', data);
    throw new Error(`Failed to send email: ${data.message || JSON.stringify(data)}`);
  }

  return { success: true, messageId: data.messageId };
};

module.exports = { sendMail };

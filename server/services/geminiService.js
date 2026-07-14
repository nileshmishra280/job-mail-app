require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');

const PROFILE = {
  name: 'Nilesh Mishra',
  education: 'BE Computer Science',
  experience: '9 months Internship',
  skills: [
    'React.js', 'Node.js', 'Express.js', 'MongoDB',
    'Java', 'Spring Boot', '.NET', 'C#',
    'JavaScript', 'HTML', 'CSS', 'Git',
    'REST APIs', 'SQL', 'MySQL', 'Redux', 'Next.js'
  ],
};

const cleanJSON = (text) => {
  text = text.replace(/```(json)?/gi, '').trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found. Raw: ' + text);
  text = match[0].replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(text);
};

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not found in .env file');
  return new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
};

/**
 * Extract job description text from an image using a vision-capable model.
 * Falls back to Groq's llama-3.2-11b-vision-preview which supports image input.
 */
const extractJDFromImage = async (imagePath) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not found in .env file');

  const client = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });

  // Read image and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  // Determine mime type from extension
  const ext = imagePath.split('.').pop().toLowerCase();
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const mimeType = mimeMap[ext] || 'image/jpeg';

  const completion = await client.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
          {
            type: 'text',
            text: 'Extract all the text from this job description image. Return only the raw text content of the job posting, nothing else.',
          },
        ],
      },
    ],
    max_tokens: 1000,
    temperature: 0.1,
  });

  return completion.choices?.[0]?.message?.content?.trim() || '';
};

const analyzeJobPost = async (jobText) => {
  const client = getGroqClient();

  const completion = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: 'You only respond with valid JSON. No markdown, no backticks, no explanation. Only a raw JSON object with double-quoted keys and string values.',
      },
      {
        role: 'user',
        content: `Analyze this job post and return a JSON object.

Job: ${jobText}

Candidate: ${PROFILE.name}, ${PROFILE.education}, ${PROFILE.experience}
Skills: ${PROFILE.skills.join(', ')}

Return exactly this structure:
{"company":"company name","role":"job title","email":"hr email or empty string","subject":"professional subject line","mail":"professional 4-5 line email body expressing interest, highlighting relevant skills, signed as ${PROFILE.name}\\nPhone: +91 8460805733"}`,
      },
    ],
    max_tokens: 400,
    temperature: 0.1,
  });

  const text = completion.choices?.[0]?.message?.content?.trim() || '';
  const parsed = cleanJSON(text);

  return {
    company: parsed.company || '',
    role:    parsed.role    || '',
    email:   parsed.email   || '',
    subject: parsed.subject || '',
    mail:    parsed.mail    || '',
  };
};

module.exports = { analyzeJobPost, extractJDFromImage };
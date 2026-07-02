require('dotenv').config();
const OpenAI = require('openai');

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
  //console.log('Model output:', text);
  return JSON.parse(text);
};

const analyzeJobPost = async (jobText) => {
  const apiKey = process.env.GROQ_API_KEY;

 // console.log('Groq API Key:', apiKey ? 'Configured ✓' : 'NOT FOUND ✗');

  if (!apiKey) throw new Error('GROQ_API_KEY not found in .env file');

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

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
{"company":"company name","role":"job title","email":"hr email or empty string","subject":"professional subject line","mail":"4 line email body signed as ${PROFILE.name}"}`,
      },
    ],
    max_tokens: 300,
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

module.exports = { analyzeJobPost };  
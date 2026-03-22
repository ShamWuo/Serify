
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('test');
    console.log('FLASH SUCCESS:', result.response.text());
  } catch (err) {
    console.log('FLASH ERROR NAME:', err.name);
    console.log('FLASH ERROR MESSAGE:', err.message);
    if (err.status) console.log('FLASH ERROR STATUS:', err.status);
  }
}

testGemini();


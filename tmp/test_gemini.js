
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in .env.local');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  const models = ['gemini-2.5-flash', 'models/gemini-2.5-flash', 'gemini-2.5-pro'];
  
  for (const modelName of models) {
    console.log(`Testing model: ${modelName}...`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Hello, are you there?');
      console.log(`Success with ${modelName}:`, result.response.text().substring(0, 50));
    } catch (err) {
      console.error(`Status ${modelName}:`, err.message);
    }
  }
}

testGemini();


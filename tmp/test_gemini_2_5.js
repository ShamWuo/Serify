
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const modelsToTest = ['gemini-2.5-flash'];
  
  for (const modelName of modelsToTest) {
    console.log(`--- Testing model: ${modelName} ---`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Verify connection');
      console.log(`SUCCESS [${modelName}]:`, result.response.text());
    } catch (err) {
      console.log(`ERROR [${modelName}]:`, err.message);
    }
  }
}

testGemini();

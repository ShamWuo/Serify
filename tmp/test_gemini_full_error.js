
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const modelsToTest = ['gemini-2.5-flash', 'gemini-2.5-flash'];
  
  for (const modelName of modelsToTest) {
    console.log(`--- Testing model: ${modelName} ---`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('test');
      console.log(`SUCCESS [${modelName}]:`, result.response.text().substring(0, 50));
    } catch (err) {
      // Print full error message and status
      console.log(`ERROR [${modelName}]:`, err.message);
      if (err.response) {
         console.log(`DATA [${modelName}]:`, JSON.stringify(err.response.data));
      }
    }
  }
}

testGemini();


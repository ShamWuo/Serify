const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function list() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        console.log('GenAI instance keys:', Object.keys(genAI));
    } catch (err) {
        console.error('Error listing models:', err.message);
    }
}
list();

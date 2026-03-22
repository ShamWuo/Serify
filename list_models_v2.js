const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function list() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // Try the older way if listModels is not on genAI
        // Actually, let's just log common properties
        console.log('Object keys:', Object.keys(genAI));
        if (genAI.listModels) {
           const models = await genAI.listModels();
           console.log('Models:', models);
        } else {
           console.log('No listModels on genAI');
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}
list();

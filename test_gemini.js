const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function test() {
    console.log('API Key present:', !!process.env.GEMINI_API_KEY);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = ['gemini-2.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash'];
    
    for (const m of models) {
        try {
            console.log(`Testing model: ${m}`);
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent('ping');
            console.log(`Success with ${m}:`, result.response.text());
        } catch (err) {
            console.error(`Failed with ${m}:`, err.message);
        }
    }
}

test();


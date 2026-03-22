const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function test_various() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = ['gemini-2.5-pro', 'gemini-2.5-flash'];
    for (const m of models) {
        try {
            console.log(`Testing: ${m}`);
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent('ping');
            console.log(`Success: ${m}`);
        } catch (err) {
            console.log(`Fail: ${m} - ${err.message}`);
        }
    }
}
test_various();


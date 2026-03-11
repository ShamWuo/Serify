import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const res = await model.generateContent('hi');
        console.log('gemini-1.5-flash works');
    } catch (e: any) {
        console.log('gemini-1.5-flash fails:', e.message);
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const res = await model.generateContent('hi');
        console.log('gemini-2.5-flash works');
    } catch (e: any) {
        console.log('gemini-2.5-flash fails:', e.message);
    }
}

test();

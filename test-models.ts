import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from the project root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function test() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const models = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'];
    
    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent('hi');
            console.log(`${m} works`);
        } catch (e: any) {
            console.log(`${m} fails:`, e.message);
        }
    }
}

test();

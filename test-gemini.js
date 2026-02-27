
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.join('=').trim().split('#')[0].trim();
    }
});

async function testModel(genAI, modelName) {
    console.log(`Testing ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: 'application/json'
            }
        });
        const result = await model.generateContent("Return a JSON object with a field 'test' set to true.");
        console.log(`${modelName} success:`, result.response.text());
        return true;
    } catch (err) {
        console.error(`${modelName} failed:`, err.message);
        return false;
    }
}

async function test() {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API key found in .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    await testModel(genAI, "gemini-2.0-flash");
    await testModel(genAI, "gemini-flash-latest");
    await testModel(genAI, "gemini-2.5-flash"); // Retrying with exact name
}

test();


const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { generateObject } = require('ai');
const { z } = require('zod');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testAISDK() {
  const apiKey = process.env.GEMINI_API_KEY;
  const google = createGoogleGenerativeAI({ apiKey });
  
  console.log('--- Testing AI SDK with gemini-2.5-flash ---');
  try {
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: z.object({
        greeting: z.string()
      }),
      prompt: 'Say hello'
    });
    console.log('SUCCESS:', object);
  } catch (err) {
    console.log('ERROR:', err.message);
    if (err.stack) console.log(err.stack);
  }
}

testAISDK();

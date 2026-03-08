
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash', // Use stable flash for test
    generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
    }
});

async function test() {
    const contentDescription = `Here are the user's notes:

  Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll. 
  It involves the conversion of carbon dioxide and water into oxygen and glucose.
  The process happens in two main stages: Light-dependent reactions and the Calvin cycle.
  The light-dependent reactions take place in the thylakoid membranes of chloroplasts.
  The Calvin cycle occurs in the stroma and does not require light directly.
  Chlorophyll is the primary pigment involved, absorbing mainly blue and red light.
  Factors affecting photosynthesis include light intensity, CO2 concentration, and temperature.`;

    const prompt = `You are an expert knowledge analyst.
${contentDescription}

Extract 3 to 5 broad "Mastery Pillars" that represent the major themes or domains of this material. 
For each pillar, identify 2 to 4 specific sub-categories (sub-concepts) that fall under it.

Return a JSON array of Mastery Pillars.

Format:
[
  {
    "id": "c1",
    "name": "Pillar Name",
    "description": "A broad, comprehensive definition of this knowledge pillar (1-2 sentences).",
    "importance": "high" | "medium" | "low",
    "relatedConcepts": ["c2"],
    "subConcepts": [
      {
        "name": "Sub-concept name",
        "description": "A concise explanation of how this fits into the pillar."
      }
    ]
  }
]

Rules:
- Use concept IDs c1, c2, c3, etc.
- "description": Provide a high-quality definition.
- "importance": "high" for the most central pillars.
- "relatedConcepts": IDs of other extracted pillars that this one builds upon or connects to.
- Focus on breadth for the pillars and depth for the sub-concepts.`;

    console.log('Extracting concepts...');
    try {
        const result = await model.generateContent(prompt);
        console.log(result.response.text());
    } catch (err) {
        console.error('Error:', err);
    }
}

test();

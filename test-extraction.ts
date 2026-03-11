
import { extractConcepts } from './lib/serify-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from the project root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function test() {
    const sampleContent = {
        id: 'test',
        type: 'text' as const,
        title: 'Photosynthesis Deep Dive',
        content: `
      Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll. 
      It involves the conversion of carbon dioxide and water into oxygen and glucose.
      The process happens in two main stages: Light-dependent reactions and the Calvin cycle.
      The light-dependent reactions take place in the thylakoid membranes of chloroplasts.
      The Calvin cycle occurs in the stroma and does not require light directly.
      Chlorophyll is the primary pigment involved, absorbing mainly blue and red light.
      Factors affecting photosynthesis include light intensity, CO2 concentration, and temperature.
    `
    };

    console.log('Extracting concepts...');
    try {
        const concepts = await extractConcepts(sampleContent);
        console.log(JSON.stringify(concepts, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

test();

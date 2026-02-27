import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateApiRequest, deductSparks, hasEnoughSparks, SPARK_COSTS } from '@/lib/sparks';
import { parseJSON } from '@/lib/serify-ai';
import { YoutubeTranscript } from 'youtube-transcript';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { content, contentType } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    const user = await authenticateApiRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sparkCost = SPARK_COSTS.SESSION_INGESTION || 2;
    const hasSparks = await hasEnoughSparks(user, sparkCost);
    if (!hasSparks) {
        return res.status(403).json({ error: 'out_of_sparks', message: `You need ${sparkCost} Sparks.` });
    }

    let processedContent = content;
    if (contentType === 'youtube') {
        try {
            const transcriptData = await YoutubeTranscript.fetchTranscript(content);
            processedContent = transcriptData.map((t: any) => t.text).join(' ');
        } catch (err) {
            console.error('YouTube transcript error:', err);
            return res.status(400).json({ message: 'Could not extract transcript from this video. It may not have subtitles enabled or it may be restricted.' });
        }
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: 'application/json',
                maxOutputTokens: 8192,
                temperature: 0.1
            },
        });

        const prompt = `
    You are an expert tutor extracting a concept map from the following learning material.
    Read the material and identify the core concepts. Also determine a short, descriptive title (3-5 words) for this material.

    For each concept, provide:
    - id: a unique short string like 'c1'
    - name: the concept name
    - definition: a 1-sentence definition
    - importance: 'primary', 'secondary', or 'contextual'
    - misconception_risk: boolean indicating if this is commonly misunderstood

    Structure the output as a JSON object with this shape:
    {
      "title": "A short descriptive title",
      "concepts": [ ... array of concept objects ... ]
    }

    Learning Material:
    ${processedContent.substring(0, 15000)}
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        let parsedData;
        try {
            parsedData = parseJSON<any>(responseText);

            if (Array.isArray(parsedData)) {
                parsedData = { title: "New Session", concepts: parsedData };
            }
        } catch (parseError) {
            console.error('Parse Error from Gemini for Process Content:', responseText);
            console.error('Actual Error:', parseError);
            let errorMessage = 'Failed to process content. The AI service might be busy or the content format is unsupported.';
            if (contentType === 'youtube' || contentType === 'article') {
                errorMessage = "Failed to extract content from the provided URL. Please ensure it's a valid, accessible link or try pasting the text/transcript directly.";
            }
            return res.status(400).json({ message: errorMessage, details: process.env.NODE_ENV === 'development' ? responseText : undefined });
        }

        await deductSparks(user, sparkCost, 'session_ingestion');

        res.status(200).json({ concepts: parsedData.concepts, title: parsedData.title });
    } catch (error) {
        console.error('Error generating concept map for user:', user, error);
        res.status(500).json({ message: 'Internal server error while processing content.' });
    }
}

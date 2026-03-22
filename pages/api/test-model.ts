import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export default async function handler(req: any, res: any) {
  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: 'Write a short greeting.',
    });
    res.status(200).json({ success: true, text });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

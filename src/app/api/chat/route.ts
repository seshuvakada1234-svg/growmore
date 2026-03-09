import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `
You are "Flora", an expert plant assistant for Monterra, a premium Indian plant store.
Your tone is helpful, warm, professional, and enthusiastic about nature.

Guidelines:
1. Answer ONLY questions related to plant care, specific plant species, gardening tips, pests, soil, watering, sunlight, and Monterra products.
2. If a user asks something unrelated to plants or gardening (e.g., politics, news, math, coding), politely say you only know about plants and gardening.
3. Keep responses concise — under 3 sentences where possible.
4. Mention Monterra's expertise in healthy, live plants if appropriate.
5. Add a relevant plant emoji occasionally to keep things friendly 🌿
`;

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('Missing GEMINI_API_KEY in .env.local');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${SYSTEM_PROMPT}\n\nUser: ${message}` }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('Gemini API error:', data.error);
      throw new Error(data.error.message || 'Gemini API error');
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm having trouble thinking right now 🌱 Please try again!";

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
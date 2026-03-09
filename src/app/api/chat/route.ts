import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('Missing GEMINI_API_KEY environment variable');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const systemPrompt = `
      You are "Flora", an expert plant assistant for Monterra, a premium Indian plant store.
      Your tone is helpful, professional, and enthusiastic about nature.
      Guidelines:
      1. Answer ONLY questions related to plant care, specific plant species, gardening tips, pests, and general plant store products.
      2. If a user asks something unrelated to plants or gardening (e.g., about politics, general news, math), politely redirect them by saying you only know about plants.
      3. Keep responses concise (under 3 sentences where possible).
      4. Mention Monterra's expertise in healthy, live plants if appropriate.
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\nUser: ${message}` }]
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
      throw new Error(data.error.message || 'API error');
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure how to answer that. Maybe a little more sunlight would help me think?";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

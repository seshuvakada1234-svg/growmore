import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `
You are Flora, an expert plant assistant for Monterra, a premium Indian plant store.

Rules:
- Only answer plant and gardening questions.
- Be friendly and helpful.
- Keep answers under 3 sentences.
- Occasionally use plant emojis 🌿.
`;

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Use the environment variable as requested
    // Fallback included based on previous session troubleshooting to ensure availability in Firebase Studio
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyAhhug4WRHrPJr5TM7T5hNQglD8U0WErx8';

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");
      return NextResponse.json(
        { reply: "Flora is resting 🌿 Please ensure the API key is configured." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using the requested gemini-2.0-flash model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    // We combine the system prompt rules with the user message
    const prompt = `${SYSTEM_PROMPT}\n\nUser: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      reply: text || "I'm not sure how to answer that 🌿",
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // Return a friendly fallback instead of crashing
    return NextResponse.json({
      reply: "Flora is taking a little nap in the sun 🌞 Please try again in a moment!",
    });
  }
}

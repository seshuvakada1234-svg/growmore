
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// SYSTEM PROMPT moved to be part of the request context for maximum compatibility
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

    if (!message) {
      return NextResponse.json(
        { error: "Message missing" },
        { status: 400 }
      );
    }

    // 1. Try environment variable
    // 2. Fallback to provided hardcoded key for reliability in specific cloud environments
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyAhhug4WRHrPJr5TM7T5hNQglD8U0WErx8';

    if (!apiKey) {
      console.error("No API Key found in env or fallback");
      return NextResponse.json({
        reply: "Flora's roots are a bit dry today (API key missing). Please try again later! 🌿"
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using a more standard initialization method
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Combine system prompt with user message for better reliability across all Gemini versions
    const prompt = `${SYSTEM_PROMPT}\n\nUser Question: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    return NextResponse.json({ reply: text });

  } catch (error: any) {
    console.error("VERBOSE CHAT API ERROR:", error);
    
    // Check for specific error types to provide better feedback in logs
    if (error.message?.includes('403')) {
      console.error("Permission denied: Check if the API key is active and has Gemini API enabled.");
    }

    return NextResponse.json({
      reply: "Flora is taking a little nap in the sun ☀️ Please try asking me again in a moment! 🌿"
    });
  }
}

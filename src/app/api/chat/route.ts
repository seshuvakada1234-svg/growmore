
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

    if (!message) {
      return NextResponse.json(
        { error: "Message missing" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Initialize the Gemini SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Configure the model with system instructions
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT
    });

    const result = await model.generateContent(message);
    const response = await result.response;
    const reply = response.text() || "I'm having trouble finding the right words 🌿";

    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Chat API Error:", error);

    // Return a friendly fallback instead of a crash
    return NextResponse.json({
      reply: "Flora is taking a little nap in the sun ☀️ Please try asking me again in a moment! 🌿"
    });
  }
}

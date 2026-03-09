import { NextResponse } from 'next/server';

const STORE_URL = 'https://growmore-blue.vercel.app/plants';

const SYSTEM_PROMPT = `You are "Flora", an expert plant assistant for Monterra, a premium Indian plant store.
Your tone is helpful, warm, professional, and enthusiastic about nature.

RULES:
1. Answer ONLY questions related to plants, gardening, care tips, diseases, identification, and Monterra products.
2. If asked something unrelated, politely redirect to plant topics.
3. Keep responses concise and friendly. Add a plant emoji occasionally 🌿

PRODUCT RECOMMENDATIONS:
- When users ask for plant suggestions, recommend 3-5 specific plants.
- Always end recommendations with: "You can buy them here:\n👉 ${STORE_URL}"
- Format recommendations as a bullet list.

PLANT IDENTIFICATION (when user uploads a photo):
- Identify the plant by name
- Provide: Common name, Scientific name, Watering frequency, Sunlight needs, Care tips, Pet safety
- Format clearly with emoji sections

DISEASE DETECTION (when user uploads a sick plant photo):
- Diagnose possible disease or problem
- Provide: Problem name, Symptoms, Treatment steps, Prevention tips

MEMORY:
- If user shares preferences (light, experience, pets, location), remember and personalize responses.`;

// Text-only model
const TEXT_MODEL = 'llama-3.3-70b-versatile';

// Vision model for image analysis
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export async function POST(req: Request) {
  try {
    const { message, history, preferences, imageBase64, mode } = await req.json();

    if (!message && !imageBase64) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('Missing GROQ_API_KEY');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Build memory context
    let memoryContext = '';
    if (preferences && Object.keys(preferences).length > 0) {
      memoryContext = `\n\nRemembered user preferences:\n${Object.entries(preferences)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')}\nPersonalize your response.`;
    }

    const useVision = !!imageBase64;
    const model = useVision ? VISION_MODEL : TEXT_MODEL;

    // Build system + history messages
    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT + memoryContext }
    ];

    // Add conversation history (last 6, text only for vision calls)
    if (!useVision && history && Array.isArray(history)) {
      history.slice(-6).forEach((msg: any) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      });
    }

    // Build user message
    let userMessage: any;

    if (useVision) {
      // Vision mode — send image + text prompt
      let textPrompt = '';

      if (mode === 'identify') {
        textPrompt = `You are a plant expert. Look at this plant image carefully and identify it.
Provide:
1. 🌱 Common Name
2. 🔬 Scientific Name
3. 💧 Watering: how often
4. ☀️ Sunlight: requirements
5. 🌿 Care Tips: 2-3 key tips
6. ⚠️ Special Notes: toxicity, pet safety

User said: "${message || 'What plant is this?'}"`;
      } else if (mode === 'disease') {
        textPrompt = `You are a plant disease expert. Look at this plant image carefully and diagnose any issues.
Provide:
1. 🦠 Problem Detected
2. 🔍 Symptoms visible
3. 💊 Treatment Steps
4. 🛡️ Prevention Tips

User said: "${message || 'What is wrong with my plant?'}"`;
      } else {
        textPrompt = `You are a plant expert. Look at this plant image and help the user.
If it looks healthy, identify it. If it looks sick, diagnose the problem.
User said: "${message || 'What is this plant?'}"`;
      }

      userMessage = {
        role: 'user',
        content: [
          { type: 'text', text: textPrompt },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64 // base64 data URL: "data:image/jpeg;base64,..."
            }
          }
        ]
      };
    } else {
      // Text-only mode
      userMessage = {
        role: 'user',
        content: message
      };
    }

    messages.push(userMessage);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Groq API error:', data.error);
      throw new Error(data.error.message || 'Groq API error');
    }

    const reply =
      data.choices?.[0]?.message?.content ||
      "I'm having trouble thinking right now 🌱 Please try again!";

    // Auto-extract preferences from text
    const extractedPreferences: Record<string, string> = {};
    const prefPatterns = [
      { key: 'light', pattern: /(low light|bright light|indirect light|direct sunlight|no sunlight)/i },
      { key: 'experience', pattern: /(beginner|expert|intermediate|new to plants|experienced)/i },
      { key: 'pets', pattern: /(have pets|have a dog|have a cat|pet.safe|pet friendly)/i },
      { key: 'location', pattern: /(indoor|outdoor|balcony|garden|office|bedroom|living room)/i },
      { key: 'watering', pattern: /(forget to water|overwater|water regularly|rarely water)/i },
    ];
    prefPatterns.forEach(({ key, pattern }) => {
      const match = (message || '').match(pattern);
      if (match) extractedPreferences[key] = match[0].toLowerCase();
    });

    return NextResponse.json({ reply, extractedPreferences });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
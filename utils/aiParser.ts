import { Trip } from '../data/trips';

const SYSTEM_PROMPT = `
You are an AI assistant for a travel booking app. 
Your task is to parse a raw WhatsApp broadcast message from a travel vendor and extract the trip details into a strict JSON format.

The user will provide the raw text. You MUST output ONLY a valid JSON array of trip objects. Do NOT include markdown code blocks (like \`\`\`json) or any other conversational text. Just the raw JSON array.

The JSON schema for a single trip must be:
{
  "title": "String (e.g. Rajmachi Camping)",
  "description": "String (detailed description)",
  "batches": [
    { "id": "generate_unique_string", "dateDuration": "String (e.g. 22-23 May)", "totalSeats": 30, "bookedSeats": 0 }
  ],
  "packages": [
    { "name": "String (e.g. From Pune)", "price": Number (extract numerical value) }
  ],
  "addOns": [
    { "name": "String (e.g. Couple Tent)", "price": Number }
  ],
  "pickupPoints": [
    { "location": "String", "time": "String", "mapLink": "String (if present, else empty)" }
  ],
  "itinerary": "String (full day by day schedule)",
  "inclusions": ["String"],
  "exclusions": ["String"],
  "thingsToCarry": ["String"],
  "cancellationPolicy": ["String"]
}

Rules:
1. If the message contains multiple different trips (e.g., a weekend summary list), return an array with multiple trip objects. If it's a single trip, return an array with 1 object.
2. If "totalSeats" is not mentioned, default to 30.
3. If "bookedSeats" is not mentioned, default to 0.
4. Extract pricing accurately. If only one price is mentioned, create one package named "Standard".
5. DO NOT hallucinate details. If inclusions/exclusions are missing, leave the array empty.
`;

export type AIProvider = 'gemini' | 'openai';

export const parseWhatsAppMessage = async (
  text: string, 
  provider: AIProvider, 
  apiKey: string
): Promise<Partial<Trip>[]> => {
  try {
    if (provider === 'gemini') {
      return await parseWithGemini(text, apiKey);
    } else {
      return await parseWithOpenAI(text, apiKey);
    }
  } catch (error) {
    console.error(`Error parsing with ${provider}:`, error);
    throw error;
  }
};

const parseWithGemini = async (text: string, apiKey: string): Promise<Partial<Trip>[]> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      { role: "user", parts: [{ text: text }] }
    ],
    systemInstruction: {
      role: "system",
      parts: [{ text: SYSTEM_PROMPT }]
    },
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const rawJsonString = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!rawJsonString) throw new Error("Empty response from Gemini");
  
  return JSON.parse(rawJsonString);
};

const parseWithOpenAI = async (text: string, apiKey: string): Promise<Partial<Trip>[]> => {
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const payload = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text }
    ],
    temperature: 0.1,
    response_format: { type: "json_object" } // Note: requires outputting a JSON object. We'll adjust prompt to output {"trips": [...]} if needed, but array root is usually fine for gpt-4 without response_format, let's keep it simple.
  };

  // OpenAI's json_object requires the prompt to specify outputting a JSON object. 
  // Let's wrap our array in an object just for OpenAI to be safe.
  const modifiedPrompt = SYSTEM_PROMPT + "\n\nCRITICAL: You must return a JSON object with a single key 'trips' containing the array.";
  payload.messages[0].content = modifiedPrompt;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const rawJsonString = data.choices?.[0]?.message?.content;
  
  if (!rawJsonString) throw new Error("Empty response from OpenAI");
  
  const parsed = JSON.parse(rawJsonString);
  return parsed.trips || parsed;
};

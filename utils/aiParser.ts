import { Trip } from '../data/trips';

const SYSTEM_PROMPT = `
You are an advanced AI travel assistant. Your task is to extract complex trip itineraries from raw WhatsApp broadcast messages and map them strictly to a valid JSON array of trip objects.

Do NOT include markdown formatting (like \`\`\`json) or conversational text. Output ONLY the raw JSON array.

JSON Schema per trip:
{
  "title": "String (Extract the main trip name, removing emojis if possible)",
  "description": "String (A comprehensive summary of the trip)",
  "batches": [
    { "id": "generate_unique_string", "dateDuration": "String (e.g., 22-23 May 2026)", "totalSeats": 30, "bookedSeats": 0 }
  ],
  "packages": [
    { "name": "String (e.g., Pune to Pune, Without Transport)", "price": Number (raw integer) }
  ],
  "addOns": [
    { "name": "String (e.g., Couple Tent, Non-Veg Meal)", "price": Number }
  ],
  "pickupPoints": [
    { "location": "String", "time": "String (e.g., 08:00 PM)", "mapLink": "" }
  ],
  "itinerary": "String (Preserve the day-by-day schedule formatting using newlines)",
  "inclusions": ["String"],
  "exclusions": ["String"],
  "thingsToCarry": ["String"],
  "cancellationPolicy": ["String"]
}

CRITICAL RULES:
1. **Multiple Dates**: If the text lists multiple upcoming dates (e.g., "22-23, 23-24 May"), create a SEPARATE object in the "batches" array for EACH unique date pair! This is crucial.
2. **Pricing/Packages**: If there are multiple price points (e.g., "Pune - 1499, Without Transport - 999"), create a separate object in the "packages" array for each option.
3. **Add-ons**: Look for phrases like "extra", "add-on", or "optional" (e.g., "Couple tent 200 extra"). Extract these into the "addOns" array.
4. **Pickup Points**: Extract every listed boarding point and its timing into the "pickupPoints" array.
5. **Lists**: Neatly separate Inclusions, Exclusions, and Things to Carry into their respective string arrays.
6. **Defaults**: If "totalSeats" is missing, use 30. If "bookedSeats" is missing, use 0. If "cancellationPolicy" is missing, leave empty.
7. Return an array of trip objects. If the message only describes one trip, return an array with 1 object.
`;

export type AIProvider = 'gemini' | 'openai';

export const parseLocalHeuristics = (text: string): Partial<Trip>[] => {
  const trip: Partial<Trip> = {
    title: '',
    description: '',
    batches: [],
    packages: [],
    addOns: [],
    pickupPoints: [],
    itinerary: '',
    inclusions: [],
    exclusions: [],
    thingsToCarry: [],
    cancellationPolicy: []
  };

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    trip.title = lines[0].trim();
  }

  // Find prices (e.g. 1499 ₹, Rs 1499, Pune - 1499)
  const priceRegex = /(?:rs|₹|inr|-)\s*(\d+(?:,\d+)*)/gi;
  const foundPrices = new Set<number>();
  for (const line of lines) {
    let match;
    while ((match = priceRegex.exec(line)) !== null) {
      const priceVal = parseInt(match[1].replace(/,/g, ''));
      if (priceVal > 100 && priceVal < 50000) {
        foundPrices.add(priceVal);
        const namePart = line.replace(match[0], '').trim();
        const pkgName = namePart.length > 0 && namePart.length < 30 ? namePart : `Option ${trip.packages!.length + 1}`;
        
        // If it explicitly says 'extra' or 'addon', put it in addOns
        if (line.toLowerCase().includes('extra') || line.toLowerCase().includes('add-on')) {
          trip.addOns!.push({ name: pkgName.replace(/\(|\)|\*/g, '').trim() || 'Add-on', price: priceVal });
        } else {
          // Prevent exact duplicate prices in packages
          if (!trip.packages!.some(p => p.price === priceVal)) {
            trip.packages!.push({ name: pkgName.replace(/cost|price|-/gi, '').trim() || 'Standard Package', price: priceVal });
          }
        }
      }
    }
  }

  // Find dates (e.g., 22-23 May or 12/06)
  const dateRegex = /(\d{1,2}(?:\s*-\s*\d{1,2})?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:\d{4})?)/gi;
  const foundDates = text.match(dateRegex);
  if (foundDates) {
    foundDates.forEach((dateStr, idx) => {
      trip.batches!.push({
        id: Date.now().toString() + idx,
        dateDuration: dateStr.trim(),
        totalSeats: 30,
        bookedSeats: 0
      });
    });
  }

  // Basic section extraction based on headers
  let currentSection = 'description';
  const itineraryLines: string[] = [];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('inclusion')) { currentSection = 'inclusions'; continue; }
    if (lowerLine.includes('exclusion')) { currentSection = 'exclusions'; continue; }
    if (lowerLine.includes('carry')) { currentSection = 'carry'; continue; }
    if (lowerLine.includes('cancel')) { currentSection = 'cancel'; continue; }
    if (lowerLine.includes('itinerary') || lowerLine.match(/^day\s*\d/)) { currentSection = 'itinerary'; }

    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      const cleanLine = line.replace(/^[•\-*]\s*/, '').trim();
      if (currentSection === 'inclusions') trip.inclusions!.push(cleanLine);
      else if (currentSection === 'exclusions') trip.exclusions!.push(cleanLine);
      else if (currentSection === 'carry') trip.thingsToCarry!.push(cleanLine);
      else if (currentSection === 'cancel') trip.cancellationPolicy!.push(cleanLine);
    }
    
    if (currentSection === 'itinerary') {
      itineraryLines.push(line);
    }
  }
  
  trip.itinerary = itineraryLines.join('\n');
  
  // If we couldn't find a description, use some text
  if (!trip.description) {
     trip.description = text.substring(0, 500) + '...';
  }

  return [trip];
};

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
  const cleanApiKey = apiKey.trim();
  const modelsToTry = [
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-2.5-flash'
  ];

  const payload = {
    contents: [
      { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\nParse the following message:\n${text}` }] }
    ],
    generationConfig: {
      temperature: 0.1
    }
  };

  let lastError = null;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanApiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        // If it's a 404, 503 (high demand), or 429 (rate limit), try the next model.
        if (response.status === 404 || response.status === 503 || response.status === 429) {
          lastError = new Error(`Gemini API Error ${response.status}: ${model} unavailable.`);
          continue; 
        }
        // If it's another error (like 403 or 400), throw immediately
        throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      let rawJsonString = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawJsonString) throw new Error("Empty response from Gemini");
      
      // Strip markdown code blocks if the model wrapped the response
      if (rawJsonString.startsWith('```')) {
        const match = rawJsonString.match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (match) {
          rawJsonString = match[1];
        }
      }
      
      return JSON.parse(rawJsonString.trim());
    } catch (err: any) {
      lastError = err;
      // Continue to next model on 404s, 503s, and 429s, throw for other critical errors
      const isRecoverable = err.message?.includes('404') || err.message?.includes('503') || err.message?.includes('429');
      if (!isRecoverable) {
         throw err;
      }
    }
  }

  // If all models failed with recoverable errors (like high demand or deprecated names)
  throw new Error("AI services are currently experiencing exceptionally high demand. Please try again in a few moments or switch to OpenAI.");
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
      'Authorization': `Bearer ${apiKey.trim()}`
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

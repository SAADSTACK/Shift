
import { GoogleGenAI, GenerateContentResponse, LiveServerMessage, Modality, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION, SHIFT_MODEL, LIVE_MODEL } from "./constants";
import { ShiftResponse } from "./types";

const ai = () => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("Gemini API Key missing in process.env.API_KEY");
  }
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Robustly parses the model response, handling both JSON and Markdown formats.
 */
export const parseShiftResponse = (text: string, response?: GenerateContentResponse): ShiftResponse => {
  let groundingUrls: Array<{ uri: string; title?: string }> = [];
  
  if (response?.candidates?.[0]?.groundingMetadata?.groundingChunks) {
    groundingUrls = response.candidates[0].groundingMetadata.groundingChunks.map((chunk: any) => {
      if (chunk.web) return { uri: chunk.web.uri, title: chunk.web.title };
      if (chunk.maps) return { uri: chunk.maps.uri, title: chunk.maps.title };
      return null;
    }).filter(Boolean);
  }

  // Handle cases where the model might refuse or return empty text
  if (!text || text.trim().length === 0) {
    return {
      missing: "The input provided was insufficient for cognitive analysis.",
      differentWay: "Try providing a more specific decision, belief, or pattern to analyze.",
      longTerm: "No clear long-term consequences could be derived from the current input.",
      nextStep: "Provide a coherent statement or question.",
      rawText: "EMPTY_RESPONSE",
      groundingUrls
    };
  }

  // Attempt JSON parsing first (primary method for Logic-only mode)
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[0]);
      return {
        missing: json.missing || "Analysis incomplete.",
        differentWay: json.differentWay || "Analysis incomplete.",
        longTerm: json.longTerm || "Analysis incomplete.",
        nextStep: json.nextStep || "Analysis incomplete.",
        rawText: text,
        groundingUrls
      };
    }
  } catch (e) {
    console.warn("JSON parse failed, falling back to Markdown extraction", e);
  }

  // Robust Markdown extraction
  const getSection = (patterns: string[]) => {
    for (const pattern of patterns) {
      const regex = new RegExp(`${pattern}[:\\s]*([\\s\\S]*?)(?=(?:\\n\\d\\.|\\n[🧠🔍⏳✅]|$))`, 'i');
      const match = text.match(regex);
      if (match && match[1].trim() && !match[1].trim().toLowerCase().includes("failed")) {
        return match[1].trim();
      }
    }
    return "Analysis unavailable for this section.";
  };

  const missing = getSection(['1\\.\\s*🧠', 'What you might be missing', '🧠']);
  const differentWay = getSection(['2\\.\\s*🔍', 'A different way to see this', '🔍']);
  const longTerm = getSection(['3\\.\\s*⏳', 'Long-term consequence', '⏳']);
  const nextStep = getSection(['4\\.\\s*✅', 'Smart next step', '✅']);

  return {
    missing,
    differentWay,
    longTerm,
    nextStep,
    rawText: text,
    groundingUrls
  };
};

export const sendTextMessage = async (message: string, useSearch = false, useMaps = false): Promise<ShiftResponse> => {
  const client = ai();
  let model = SHIFT_MODEL;
  const tools: any[] = [];
  let toolConfig: any = undefined;

  const formatReinforcement = `\n\nIMPORTANT: You MUST structure your response with these exact headers:
1. 🧠 What you might be missing: [Content]
2. 🔍 A different way to see this: [Content]
3. ⏳ Long-term consequence: [Content]
4. ✅ Smart next step: [Content]`;

  if (useSearch) {
    model = 'gemini-3-flash-preview';
    tools.push({ googleSearch: {} });
  } else if (useMaps) {
    model = 'gemini-2.5-flash';
    tools.push({ googleMaps: {} });
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => 
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }
        }
      };
    } catch (e) { 
      console.warn("Location access denied or timed out for maps grounding"); 
    }
  }

  const response: GenerateContentResponse = await client.models.generateContent({
    model,
    contents: (useSearch || useMaps) ? message + formatReinforcement : message,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      tools,
      toolConfig,
      responseMimeType: (useMaps || useSearch) ? undefined : "application/json",
      responseSchema: (useMaps || useSearch) ? undefined : {
        type: Type.OBJECT,
        properties: {
          missing: { type: Type.STRING },
          differentWay: { type: Type.STRING },
          longTerm: { type: Type.STRING },
          nextStep: { type: Type.STRING },
        },
        required: ["missing", "differentWay", "longTerm", "nextStep"]
      }
    }
  });

  if (!response.candidates || response.candidates.length === 0) {
    throw new Error("The model failed to generate any candidates. This might be due to safety filters.");
  }

  const text = response.text || "";
  return parseShiftResponse(text, response);
};

export const editImage = async (prompt: string, base64Image: string, mimeType: string): Promise<string | null> => {
  const client = ai();
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType } },
        { text: prompt }
      ]
    }
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  return null;
};

export const transcribeAudio = async (audioBase64: string): Promise<string> => {
  const client = ai();
  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: audioBase64, mimeType: 'audio/wav' } },
        { text: "Transcribe the following audio exactly." }
      ]
    }
  });
  return response.text || "";
};

export const generateSpeech = async (text: string): Promise<AudioBuffer | null> => {
  const client = ai();
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) return null;

  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  return await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
};

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

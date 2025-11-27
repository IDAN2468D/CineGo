import { GoogleGenAI, Type } from "@google/genai";

// Access API key from environment
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AiRecommendation {
  title: string;
  genre: string;
  synopsis: string;
}

export const geminiService = {
  getRecommendations: async (query: string): Promise<AiRecommendation[]> => {
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a movie expert catering to an Israeli audience. 
        The user wants movie recommendations based on this request: "${query}". 
        
        Return a JSON object with a key 'recommendations' containing an array of exactly 5 relevant movies.
        For each movie, provide:
        1. 'title': The official English title (for database lookup).
        2. 'genre': The primary genre in Hebrew (e.g., "פעולה", "דרמה").
        3. 'synopsis': A brief, engaging synopsis in Hebrew (2-3 sentences).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    genre: { type: Type.STRING },
                    synopsis: { type: Type.STRING }
                  },
                  required: ["title", "genre", "synopsis"]
                }
              }
            }
          }
        }
      });

      const json = JSON.parse(response.text || '{}');
      return json.recommendations || [];
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return [];
    }
  },

  summarizeReviews: async (reviewsText: string, movieTitle: string): Promise<{ sentiment: string, summary: string } | null> => {
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a movie critic assistant. 
        Summarize the following user reviews for the movie "${movieTitle}" into a concise paragraph in Hebrew.
        Also determine the general sentiment (Positive, Mixed, or Negative) in Hebrew (חיובי, מעורב, שלילי).
        
        Reviews:
        ${reviewsText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "A concise summary of the reviews in Hebrew." },
              sentiment: { type: Type.STRING, description: "The general sentiment: חיובי, מעורב, or שלילי." }
            },
            required: ["summary", "sentiment"]
          }
        }
      });

      const json = JSON.parse(response.text || '{}');
      return {
        summary: json.summary,
        sentiment: json.sentiment
      };
    } catch (error) {
      console.error("Gemini Summary Error:", error);
      return null;
    }
  },

  findPlaces: async (query: string): Promise<{ text: string; chunks: any[] }> => {
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Find popular cinema locations and movie theaters in: ${query}. 
        Provide a helpful response in Hebrew describing the top options.`,
        config: {
          tools: [{ googleMaps: {} }],
        }
      });

      return {
        text: response.text || "",
        chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (error) {
      console.error("Gemini Maps Error:", error);
      return { text: "שגיאה בחיפוש מיקומים. אנא נסה שנית.", chunks: [] };
    }
  }
};
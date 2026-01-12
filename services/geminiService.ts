
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getLoreForItem = async (itemName: string, category: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a short, epic, and dark fantasy lore description (2-3 sentences) for a Shaiya game item called "${itemName}" which is a ${category}. Make it sound like it belongs in a world of Light vs Fury. Output only the text in Spanish.`,
    });
    return response.text || "No se pudo invocar la sabiduría de Etain...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "El destino ha ocultado la historia de este objeto.";
  }
};

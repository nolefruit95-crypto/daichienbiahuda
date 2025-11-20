import { GoogleGenAI } from "@google/genai";

// Initialize the client with the API key from the environment
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generatePenalty = async (loserName: string): Promise<string> => {
  if (!apiKey) {
    // Fallback if offline
    const penalties = ["Uống 100%", "Uống 50%", "Uống 30%"];
    const random = penalties[Math.floor(Math.random() * penalties.length)];
    return `${random} (Offline Mode)`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Bạn là trọng tài của game uống bia. Người chơi tên "${loserName}" vừa thua cuộc (uống chậm nhất).
      Quy luật hình phạt CHỈ ĐƯỢC CHỌN 1 trong 3 mức sau:
      1. "Uống 100% ly này"
      2. "Uống 50% ly này"
      3. "Uống 30% ly này"
      
      Hãy chọn ngẫu nhiên một mức, và kèm theo một lý do hài hước, cà khịa ngắn gọn (dưới 15 từ).
      Ví dụ: "Uống 50% - Vì cái tội lề mề!", "Uống 100% - Phạt cho nhớ đời!".`,
      config: {
        temperature: 1.1,
      }
    });

    return response.text || "Uống 100% - Vì AI bảo thế!";
  } catch (error) {
    console.error("Error generating penalty:", error);
    return `Uống 50% - Lỗi mạng rồi, uống đi!`;
  }
};

export const generateCommentary = async (winnerName: string): Promise<string> => {
    if (!apiKey) return "";
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Người chơi tên "${winnerName}" vừa chiến thắng game uống bia. Khen 1 câu cực ngắn (dưới 10 từ) phong cách kiếm hiệp.`,
        });
        return response.text || "Cao thủ võ lâm!";
    } catch (e) {
        return "";
    }
}
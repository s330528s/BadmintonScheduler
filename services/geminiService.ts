import { GoogleGenAI } from "@google/genai";
import { Match, MatchType } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateMatchCommentary = async (match: Match): Promise<string> => {
  const ai = getClient();
  if (!ai) return "請設定 API Key 以啟用 AI 球評功能。";

  const teamANames = match.teamA.map(p => p.name).join(' & ');
  const teamBNames = match.teamB.map(p => p.name).join(' & ');
  const typeText = match.type === 'singles' ? '單打' : '雙打';

  const prompt = `
    這是一場羽球${typeText}比賽。
    隊伍 A: ${teamANames}
    隊伍 B: ${teamBNames}
    
    請扮演一位熱血幽默的體育主播，用繁體中文為這場對決生成一句簡短、充滿期待的開場介紹（不超過 50 字）。
    例如提到雙方的氣勢，或是這是一場宿命的對決。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "AI 正在熱身中...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 球評暫時離席喝水中...";
  }
};

export const getTacticalAdvice = async (type: MatchType): Promise<string> => {
   const ai = getClient();
   if (!ai) return "請設定 API Key 以獲取戰術建議。";

   const prompt = `給我一個關於羽球${type === 'singles' ? '單打' : '雙打'}的高級戰術建議。請用繁體中文回答，簡短有力，不超過 60 字。`;

   try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "保持專注，眼明手快！";
  } catch (error) {
    return "多喝水，保持體力！";
  }
}
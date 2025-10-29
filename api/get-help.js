// /api/get-help.js
// 這是 Vercel Serverless Function

// 1. 載入最新的 @google/genai 套件
const { GoogleGenAI } = require('@google/genai');

// --- Gemini 設定 ---
// 2. 初始化客戶端 (Client)
// (我們不再在這裡定義 'model'，因為 'getGenerativeModel' 函數不存在)
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

// --- Serverless Function 主程式 ---
export default async function handler(req, res) {
  
  // (CORS 和請求方法檢查 - 保持不變)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  console.log("Vercel Function: 收到請求:", req.body);

  try {
    // 4. 從請求的 body 中獲取資料
    const { question, lat, lng } = req.body;

    // 5. 驗證資料
    if (!question || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "缺少 'question', 'lat', 或 'lng' 欄位。" });
    }

    // 6. 建立給 Gemini 的提示 (Prompt)
    const prompt = `
      你是一個專業的寵物醫療助手。
      使用者的情況是："${question}"
      使用者的 GPS 位置是：緯度 ${lat}, 經度 ${lng}

      請嚴格依照以下的 JSON 格式回覆，不要有任何多餘的文字：
      {
        "advice": "(string) 根據使用者的情況，提供簡短、冷靜的應對建議。",
        "mapUrl": "(string) 根據使用者的情況和 GPS 位置，生成一個 Google Maps 的「搜尋」URL，幫他們尋找附近最適合的地點（例如：'動物醫院' 或 '24小時獸醫'）。"
      }
    `;

    // 7. (重大更新!) 呼叫 Gemini API
    // 我們改用 genAI.models.generateContent 語法，並在這裡傳入模型和提示
    console.log("Vercel Function: 正在呼叫 Gemini...");
    
    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash", // 指定模型
      contents: [{ parts: [{ text: prompt }] }], // 傳遞提示 (使用新的 'contents' 結構)
      generationConfig: {
        responseMimeType: "application/json" // 強制 JSON 輸出
      }
    });

    const response = await result.response;
    const jsonText = response.text();

    console.log("Vercel Function: Gemini 回應:", jsonText);

    // 8. 將 Gemini 的 JSON 回應傳回給前端
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(jsonText);

  } catch (error) {
    console.error("Vercel Function: 發生錯誤:", error);
    return res.status(500).json({ error: "AI 回應時發生錯誤。" });
  }
}

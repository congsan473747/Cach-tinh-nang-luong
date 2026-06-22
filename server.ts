import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI client
let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY chưa được khai báo trong Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history, userInfo } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Tin nhắn không được bỏ trống" });
    }

    const ai = getAI();
    
    // Systemic context for the nutrition specialist
    const systemPrompt = `Bạn là một bác sĩ chuyên khoa dinh dưỡng cao cấp khoa học, tận tụy và thông thái tên là Chuyên gia FitNutri.
Nhiệm vụ của bạn là tư vấn chế độ ăn uống lành mạnh, cân đối các chỉ số: Calo (Calories), Kali (Potassium/K), Protein (Chất đạm), và Fat (Chất béo).

Thông tin hiện tại của người dùng:
${userInfo ? JSON.stringify(userInfo, null, 2) : "Chưa có thông số cụ thể."}

Hướng dẫn chuyên môn chính:
1. Luôn tương tác lịch sự, thân thiện, khoa học bằng Tiếng Việt.
2. Về KALI (K): Nhấn mạnh rằng nhu cầu tiêu chuẩn cho người lớn khỏe mạnh là khoảng 3500-4700mg/ngày giúp cân bằng huyết áp và tim mạch. Tuy nhiên, nếu họ bị bệnh thận mãn tính hay suy giảm chức năng thận, họ phải giới hạn ở mức nghiêm ngặt là dưới 2000mg/ngày. Hãy giải thích khuyên răn từng đối tượng cụ thể phù hợp với sức khỏe của họ.
3. Khi phân tích thực đơn, ưu tiên chỉ dẫn cả thực phẩm nguồn Thực vật (Plant-based: đậu, rau, hạt, nấm...) và Động vật (Animal-based: thịt nạc, cá, trứng, hải sản...), tạo chế độ ăn đa dạng tối ưu.
4. Trả lời mạch lạc, súc tích, sử dụng dấu đầu dòng (*) để người đọc dễ duyệt thực đơn gợi ý. Tránh dài dòng vô bổ, hãy xưng hô là "Chuyên gia FitNutri" hoặc "Bác sĩ FitNutri".
5. Giải đáp mọi thắc mắc về thực phẩm mà người dùng nhập vào, ước lượng dinh dưỡng hoặc đưa ra lời khuyên tăng/giảm cân hiệu quả.`;

    // Map history to correct format
    let contents = [];
    if (history && Array.isArray(history)) {
      contents = history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
    }
    
    // Current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({ 
      error: error.message || "Đã xảy ra lỗi khi kết nối với máy chủ AI."
    });
  }
});

// Start server & mount Vite middleware
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();

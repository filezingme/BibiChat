
import { GoogleGenAI } from "@google/genai";
import { Document } from "../types";

// Hàm khởi tạo AI (Lấy từ môi trường hoặc bạn có thể dán trực tiếp key vào đây nếu test local)
const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY không tồn tại. Vui lòng thiết lập biến môi trường hoặc file .env");
  }
  // Use named parameter and direct process.env.API_KEY access as per guidelines
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getChatResponse = async (
  userInput: string,
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  knowledgeBase: Document[],
  botName: string
): Promise<string> => {
  const ai = getAIClient();
  
  // Tổng hợp kiến thức từ kho tài liệu đã upload
  const context = knowledgeBase
    .filter(doc => doc.status === 'indexed')
    .map(doc => `[Tài liệu: ${doc.name}]\n${doc.content}`)
    .join('\n\n');

  // CHỈNH SỬA TẠI ĐÂY: Thay đổi "tính cách" và "quy tắc" của Bot
  const systemInstruction = `
    Bạn là một trợ lý hỗ trợ khách hàng chuyên nghiệp tên là "${botName}". 
    Nhiệm vụ của bạn là trả lời các câu hỏi của khách hàng DỰA TRÊN ngữ cảnh kho kiến thức được cung cấp dưới đây.
    
    KHO KIẾN THỨC:
    ${context || "Hiện chưa có tài liệu nào. Hãy trả lời lịch sự rằng bạn đang cập nhật dữ liệu."}
    
    QUY TẮC PHẢN HỒI:
    1. Trả lời bằng ngôn ngữ mà khách hàng sử dụng (mặc định là Tiếng Việt).
    2. Nếu thông tin có trong Kho Kiến Thức, hãy sử dụng nó để trả lời chính xác.
    3. Nếu không có thông tin, hãy nói: "Xin lỗi, tôi chưa có thông tin về vấn đề này. Bạn có muốn kết nối với nhân viên hỗ trợ không?"
    4. Không tự bịa đặt thông tin nằm ngoài tài liệu.
    5. Sử dụng Markdown để trình bày câu trả lời đẹp mắt (list, bold...).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Bạn có thể đổi sang 'gemini-3-pro-preview' nếu cần xử lý phức tạp hơn
      contents: userInput,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    // Access .text property directly from response
    return response.text || "Tôi gặp khó khăn khi xử lý câu hỏi này.";
  } catch (error) {
    console.error("Lỗi Gemini API:", error);
    return "Hệ thống AI đang bận, vui lòng thử lại sau giây lát.";
  }
};

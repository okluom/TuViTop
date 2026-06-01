import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const currentDir = typeof __dirname !== "undefined"
  ? __dirname
  : (import.meta?.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API endpoint for AI Tử Vi Horoscope Interpretation
  app.post("/api/interpret", async (req, res) => {
    try {
      const { chartData, customApiKey, modelSelection } = req.body;

      if (!chartData) {
        return res.status(400).json({ error: "Thiếu dữ liệu lá số Tử Vi." });
      }

      // Bring Your Own Key (BYOK) model: Clean boundary quotes and check for validity of user's key
      let cleanApiKey = (customApiKey ? customApiKey.trim() : "");
      
      // Strip leading and trailing double or single quotes if mistakenly pasted
      if (cleanApiKey.startsWith('"') && cleanApiKey.endsWith('"')) {
        cleanApiKey = cleanApiKey.slice(1, -1).trim();
      } else if (cleanApiKey.startsWith("'") && cleanApiKey.endsWith("'")) {
        cleanApiKey = cleanApiKey.slice(1, -1).trim();
      }

      // Safeguard against invalid string placeholders
      if (cleanApiKey === "null" || cleanApiKey === "undefined") {
        cleanApiKey = "";
      }

      const finalApiKey = cleanApiKey || (process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "");

      if (!finalApiKey) {
        return res.status(400).json({
          error: "Yêu cầu khóa API: Quý vị chưa nhập API Key của riêng mình và hệ thống cũng chưa được cấu hình khóa mặc định. Vui lòng nhập khóa API Gemini cá nhân ở thanh cấu hình phía trên trước khi khởi động AI luận giải."
        });
      }

      // Initialize Google GenAI with appropriate key and custom user-agent for telemetry
      const ai = new GoogleGenAI({
        apiKey: finalApiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      // Select valid model or default to gemini-3.5-flash
      let modelName = "gemini-3.5-flash";
      if (modelSelection === "gemini-3.1-flash-lite") {
        modelName = "gemini-3.1-flash-lite";
      }

      const genderStr = chartData.gender === "Nam" ? "Nam (Dương Nam/Âm Nam)" : "Nữ (Dương Nữ/Âm Nữ)";

      const prompt = `Bạn là một Minh Sư Tử Vi Tứ Hóa & Tam Hợp Môn danh tiếng lừng lẫy thuộc trường phái thực chiến của Khâm Thiên Môn (Đài Loan), kết hợp nhuần nhuyễn với chiều sâu triết lý Nhân Quả cổ học Việt Nam. Bạn đóng vai trò là một người THẦY CÓ TÂM, chân thành nhưng vô cùng uy nghiêm, tuân thủ nguyên tắc tối thượng: "NÓI THẬT & TRỰC DIỆN ⚡" - Có Cát luận Cát, có Hung luận Hung, thẳng thắn thấu đáo bất vị nể, không vuốt ve xoa dịu vô nghĩa, không hù dọa trục lợi mà chỉ rõ gốc rễ sinh mệnh để đương số tự xoay chuyển dòng năng lượng nghiệp quả.

--- PHƯƠNG PHÁP TRIỂN KHAI CORE LOGIC LÁ SỐ TỬ VI BẮT BUỘC (QUAN TRỌNG NHẤT) ---

Bạn phải bám sát 100% dữ liệu thực tế đóng trong 12 cung của lá số được cung cấp bên dưới để luận giải. Tuyệt đối không bịa đặt các sao không có hoặc bỏ qua các yếu tố cấu trúc hình học cốt lõi sau:

1. **QUY LUẬT TAM PHƯƠNG TỨ CHÍNH (QUYẾT ĐỊNH 80% KHÍ KHÁI CỦA CUNG)**:
   Mỗi cung không tồn tại độc lập mà chịu sự chi phối chặt chẽ từ 3 cung vị kết nối trong hệ tọa độ:
   - **Chính Cung:** Cung đang được xét.
   - **Xung Chiếu (Đối cung):** Cung vị ở vị trí đối lập 180 độ, cách mặt cung hiện tại đúng 6 bước chỉ số index (Ví dụ: Index p.index và (p.index + 6) % 12). Cung xung chiếu phản chiếu khát khao, ngoại giới tác động trực diện, hoặc các mối nguy tiềm ẩn từ bên ngoài.
   - **Tam Hợp (Trine):** Hai cung vị còn lại trong tam giác hành của chi cung, cách Chính Cung lần lượt 4 và 8 bước chỉ số index (Ví dụ: Index p.index, (p.index + 4) % 12, và (p.index + 8) % 12).
     - *Nhóm Kim (Tỵ - Dậu - Sửu):* Biểu trưng cho sự sắc bén, tài chính gắt gao, kỷ luật cốt lõi.
     - *Nhóm Mộc (Hợi - Mão - Mùi):* Biểu trưng cho học thuật, sự trưởng thành nhân sinh, lòng trắc ẩn từ tốn.
     - *Nhóm Hỏa (Dần - Ngọ - Tuất):* Biểu trưng cho khát vọng, năng lượng bộc phát truyền thông, danh vọng bùng cháy.
     - *Nhóm Thủy (Thân - Tý - Thìn):* Biểu trưng cho trí tuệ di động, sự biến chuyển dòng chảy thương mại ẩn mật.
   -> *Yêu cầu:* Khi luận giải bất kỳ cung nào (đặc biệt là Mệnh, Tài, Quan, Phối/Phu Thê, Di), bạn PHẢI phân tích sự liên kết và tương tác giữa các sao đóng ở 3 cung tam hợp xung chiếu vây quanh đó. Chỉ rõ các sao kìm hãm hay thúc đẩy nhau thế nào.

2. **QUY LUẬT NHỊ HỢP (ẨN SÓNG HUYỀN CHẾ)**:
   Liên kết cộng hưởng ngầm giữa các cặp địa chi âm dương:
   - Tý (0) <-> Sửu (1) | Dần (2) <-> Hợi (11) | Mão (3) <-> Tuất (10) | Thìn (4) <-> Dậu (9) | Tỵ (5) <-> Thân (8) | Ngọ (6) <-> Mùi (7).
   -> *Ý nghĩa cốt lõi:* Cung nhị hợp giống như năng lượng hẫu thuẫn thụ động hoặc gánh nặng vô hình mà đương số không hề hay biết nhưng vẫn chảy ngầm cải sửa mệnh thế.

3. **QUY LUẬT LỤC HẠI (摩擦 CHIẾU XUNG RẠN NỨT)**:
   Các cặp địa chi gây xung khắc ma sát, hao tán nội lực ghê gớm khi ở cạnh nhau:
   - Tý (0) - Mùi (7) | Sửu (1) - Ngọ (6) | Dần (2) - Tỵ (5) | Mão (3) - Thìn (4) | Thân (8) - Hợi (11) | Dậu (9) - Tuất (10).
   -> *Ý nghĩa cốt lõi:* Nơi xảy ra lục hại là nơi dễ nhen nhóm các vết nứt lòng tin bộc phát ngầm từ định kiến âm thầm phá hoại đại cuộc.

4. **TỰ PHI TỨ HÓA (DYNAMICS OF FLYING STARS)**:
   Gốc rễ cát hung biến đổi của Khâm Thiên Môn. Mỗi cung vị đều có Thiên can riêng bộc lộ ở đầu tên cung (Giáp, Ất, Bính, Đinh, Mậu, Kỷ, Canh, Tân, Nhâm, Quý). Can này sẽ trực tiếp phát lệnh bay (Phi Tinh) 4 loại Hóa (Lộc - Quyền - Khoa - Kỵ) đi tìm các tinh tú đóng ở các cung vị khác trên lá số để thắt nút nhân duyên nghiệp quả:
   - *Ví dụ:* Nếu cung Phu Thê mang Can Giáp, nó sẽ bay Hóa Kỵ (ải nợ nần khổ ải cấu xé) đến Thái Dương đóng ở cung nào của bạn? Nếu Thái Dương ấy đóng ở cung Tài Bạch, nghĩa là định mệnh hôn nhân sẽ gây gánh nặng nợ nần hoặc mâu thuẫn khốc liệt về tiền bạc dòng tiền mặt của đương số. Bạn phải lần theo Thiên Can cung vị để nói rõ đường bay Tứ Hóa này!

5. **CUNG THÂN (VŨ ĐÀI HÀNH ĐỘNG TUỔI TRUNG NIÊN - SAU 30 TUỔI)**:
   - Hãy truy tìm cung nào có đánh dấu \`[CUNG THÂN ĐỒNG CUNG]\` (isBodyPalace: true).
   - Trước 30 tuổi con người sống theo bản năng Cung Mệnh. Sau 30 tuổi, thói quen hành động thực tế của Cung Thân bắt đầu trỗi dậy chi phối toàn diện kết quả sướng khổ. Hãy vạch rõ sự chuyển hóa tư duy từ Mệnh sang Thân để đương số tự biết nén mình tiến lui đúng nhịp điệu thời gian.

--- NGUYÊN TẮC LUẬN GIẢI QUYẾT ĐOÁN VÀ SÂU SẮC ---

1. **TUYỆT ĐỐI CẤM MÀO ĐẦU / CHÀO HỎI LÊ THÊ**:
   - Nghiêm cấm hoàn toàn các câu chào hỏi, dẫn dắt lê thê kiểu: "Chào bạn...", "Cảm ơn quý vị...", "Dưới đây là luận giải lá số...", "Lá số của bạn gồm...".
   - BẮT ĐẦU NGAY DÒNG ĐẦU TIÊN bằng một nhận định tổng quan cực kỳ uy lực, đanh thép và chấn động nhất phản ánh trúng phóc linh hồn bản mệnh hay đại vận hiện tại của đương số. Đi thẳng vào việc luận giải!

2. **CƠ CHẾ "7 PHẦN CHỦ QUAN - 3 PHẦN THẾ SỰ CHÂN THỰC" (GỐC RỄ NHÂN QUẢ CHỦ ĐẠO)**:
   - **7 Phần Chủ quan (70% Trọng tâm tinh thần):** Đào cực sâu vào nội tâm, định kiến hành vi, phản ứng vô thức, lòng kiêu hãnh hay điểm mù bẩm sinh của đương số. Quyết định số phận không phải do bốc ngẫu nhiên rủi may bên ngoài, mà chính là sự phản chiếu tâm thức bên trong ("Tâm sinh Cảnh").
     - *Ví dụ:* Kình Dương hãm ở Mệnh không chỉ là "bị họa xui ngẫu nhiên", mà nguồn cơn chính do tính khí cứng đầu, tự tôn độc đoán quật cường, thích lên mặt dạy đời hoặc hiếu thắng trực diện mà tự chuốc lấy oán thù. Hóa Kỵ thủ Mệnh không phải do "ai cũng xấu xa ghét mình", mà do bản tính chấp niệm nặng nề, tự đa nghi oán trách, tự đóng sập lòng mình dầm mưa rồi trách người khác bất công. Thầy phải vạch trần vết nứt tâm lý học thuật này dưới chế độ "Nói Thật & Trực Diện" để đương số tự biết sửa đổi tấm lòng.
   - **3 Phần Khách quan (30% Ngoại giới/Thế sự thực tế):** Khắc họa cô đọng bối cảnh xã hội, các biến động thế sự thực tiễn đang tác động lên mệnh bàn để giúp đương số có tầm nhìn chiến lược vĩ mô vững vàng.

3. **VIẾT LUẬN GIẢI SÁT SƯỜN, ĐỜI THỰC PHONG PHÚ (TUYỆT ĐỐI TRÁNH KHÁI NIỆM MƠ HỒ CHUNG CHUNG)**:
   - Nghiêm cấm dùng các từ sáo rỗng vô hồn như "hao tài do hợp đồng", "rắc rối sự nghiệp", "gặp xui xẻo gãy đổ". Hãy phô diễn đầu óc phong phú về xã hội thời đại mới (đầu tư, tài chính vĩ mô, công nghệ thông tin, quản trị số, bẫy dòng tiền) để dịch nghĩa tương tác giữa sao và cung một cách cực kỳ thực tế:
     - *Ví dụ về hao tài:* Khi phát hiện Không Kiếp hay Đại Tiểu Hao hãm địa thủ tại Tài/Quan, hãy vạch rõ: "Hao hụt tài chính dòng tiền mặt đột ngột do lòng tham lấn lướt lý trí, đầu cơ nhầm vào các loại tài sản ảo bóng bóng, bẫy đa cấp tài chính ảo tưởng, dự án bất động sản treo không rõ pháp lý, hoặc chuyển khoản hợp tác vội vàng mà không qua tư vấn kiểm tra giấy tờ cốt lõi."
     - *Ví dụ về rắc rối sự nghiệp:* Khi Thiên Cơ ngộ Kình Dương hãm ở Quan Lộc, hãy lột tả: "Hệ thống kế hoạch kinh doanh sụp đổ giờ chót do thói độc đoán tự ý quyết định, rò rỉ chiến lược kinh doanh lõi sang đối thủ hay do xung đột bộc phát trực diện về nhượng quyền thương hiệu và phân chia lợi ích nội bộ."
     - *Ví dụ về thị phi:* Khi Cự Môn ngộ Hóa Kỵ ngự Nô Bộc/Thiên Di, hãy lột tả: "Sự sụp đổ lòng tin xuất phát từ cam kết suông bằng miệng thiếu chứng từ pháp lý vững chắc, hoặc do bôi nhọ danh tiếng có chủ đích trên không gian số truyền thông, bị đối tác lập liên minh ngầm quay lưng phản bội ở thời khắc nhạy cảm nhất."

4. **KHOA HỌC HÓA BẢN MỆNH - BIỆN PHÁP HÓA GIẢI THỰC HÀNH**:
   - Có cát nói cát để đương số biết hướng kích hoạt các tài nguyên đỉnh cao nhất của mình, tạo dựng thiên thời địa lợi.
   - Có hung nói hung để đương số biết sợ mà rèn giũa: Biết chủ động bảo mật giấy tờ cốt lõi (trị Cự Kỵ), kỷ luật hóa tài chính dòng tiền mặt rõ ràng (trị Không Kiếp), thiền tính học cách hạ cái tôi xuống bớt bộc bộc bốc đồng (trị Hỏa Linh Đà). Tuyệt đối hướng đương số tu tâm dưỡng tính sửa hành vi thay vì hướng đi lễ bái cúng bái mê tín dị đoan.

--- DỮ LIỆU THÔNG TIN LÁ SỐ ĐƯƠNG SỐ ---
- Giới tính: ${genderStr}
- Ngày dương lịch: ${chartData.solarDate} (Giờ sinh: ${chartData.solarTime})
- Ngày âm lịch: ${chartData.lunarDate} (Cơ Bản: ${chartData.chineseDate})
- Bản mệnh / Cục: ${chartData.fiveElementsClass}
- Cầm tinh / Chòm sao: Sinh năm ${chartData.zodiac} - Chòm sao ${chartData.sign}
- Mệnh chủ: ${chartData.soul} | Thân chủ: ${chartData.body}
- Năm xem vận hạn chủ lực: ${chartData.transitYear || 2026}
- Tuổi mụ khi xem hạn: ${chartData.transitLunarAge || "Chưa rõ"} tuổi
- Cung Đại hạn (100 năm): Cung ${chartData.transitDecadalPalace || "Chưa rõ"}
- Cung Tiểu hạn (1 năm): Cung ${chartData.transitYearlyPalace || "Chưa rõ"}
- Cung Lưu niên Thái tuế: Cung ${chartData.transitLuuThaiTuePalace || "Chưa rõ"}

--- PHẢN ÁNH 12 CUNG VỊ & TOÀN BỘ SAO TRÊN LÁ SỐ ---
${chartData.palaces.map((p: any) => {
  const major = p.majorStars.map((s: any) => `${s.name} (${s.brightness || ''})`).join(", ");
  const minor = p.minorStars.map((s: any) => s.name).join(", ");
  const adj = p.adjectiveStars.map((s: any) => s.name).join(", ");
  return `Cung thứ ${p.index + 1}: ${p.name} (Địa chi ${p.earthlyBranch}, Thiên can ${p.heavenlyStem})${p.isBodyPalace ? " - [CUNG THÂN ĐỒNG CUNG]" : ""}
  - Chính tinh: ${major || "Không có (Cung Vô Chính Diệu)"}
  - Cát tinh / Lộc mã / Trợ tinh / Sao lưu: ${minor || "Không"}
  - Sát tinh / Hung tinh / Tạp tinh phụ: ${adj || "Không"}
  - Vòng Tràng Sinh: ${p.changsheng12}
  - Đại hạn: Từ ${p.decadal.range[0]} tuổi đến ${p.decadal.range[1]} tuổi
`;
}).join("\n")}

--- KHUNG LUẬN GIẢI CHƯƠNG TRÌNH CHI TIẾT ---

Bạn hãy soạn thảo bình giải chi tiết gồm 6 phần lớn sau đây bằng chữ quốc ngữ cực kỳ sâu sắc, phân tích chính xác từng sao và kết nối liên hoàn:

1. **TAM PHƯƠNG TỨ CHÍNH & THẾ ĐỨNG LÁ SỐ (BẢN SẮC CẤU TRÚC Ý THỨC & 7 PHẢN XẠ CHỦ QUAN)**:
   Mổ xẻ sâu sắc tính cách bẩm sinh của đương số bằng cách liên kết chặt chẽ cung Mệnh với 3 cung vị vây quanh học thuyết Tam Phương Tứ Chính: Thiên Di (đối cung), Quan Lộc (tam hợp), Tài Bạch (tam hợp). Bạn hãy trích xuất trực tiếp tên các sao đóng ở ba cung vị này của họ để phân tích điểm sáng, điểm hiểm nghệ thuật hành xử bấy lâu và điểm mù cốt lõi bẩm sinh. Chỉ rõ nghiệp lý nhân quả đã tự định hình từ thói phản xa bộc trực không tự biết của họ bấy lâu nay.

2. **KRONOS TỨ HÓA (KHOA - QUYỀN - LỘC - KỴ) THEO KINH TOÀN NIÊN CHIẾN LƯỢC**:
   Xác định rõ Thiên can tuổi sinh của đương số (ví dụ: Giáp, Ất, Bính, Đinh...) rồi áp dụng chuẩn xác quy luật Tứ Hóa để giải thích:
   - **Giáp**: Liêm Trinh (Lộc) - Phá Quân (Quyền) - Vũ Khúc (Khoa) - Thái Dương (Kỵ)
   - **Ất**: Thiên Cơ (Lộc) - Thiên Lương (Quyền) - Tử Vi (Khoa) - Thái Âm (Kỵ)
   - **Bính**: Thiên Đồng (Lộc) - Thiên Cơ (Quyền) - Văn Xương (Khoa) - Liêm Trinh (Kỵ)
   - **Đinh**: Thái Âm (Lộc) - Thiên Đồng (Quyền) - Thiên Cơ (Khoa) - Cự Môn (Kỵ)
   - **Mậu**: Tham Lang (Lộc) - Thái Âm (Quyền) - Hữu Bật (Khoa) - Thiên Cơ (Kỵ)
   - **Kỷ**: Vũ Khúc (Lộc) - Tham Lang (Quyền) - Thiên Lương (Khoa) - Văn Khúc (Kỵ)
   - **Canh**: Thái Dương (Lộc) - Vũ Khúc (Quyền) - Thái Âm (Khoa) - Thiên Đồng (Kỵ)
   - **Tân**: Cự Môn (Lộc) - Thái Dương (Quyền) - Văn Khúc (Khoa) - Văn Xương (Kỵ)
   - **Nhâm**: Thiên Lương (Lộc) - Tử Vi (Quyền) - Thiên Phủ (Khoa) - Vũ Khúc (Kỵ)
   - **Quý**: Phá Quân (Lộc) - Cự Môn (Quyền) - Thái Âm (Khoa) - Tham Lang (Kỵ)
   Hãy tìm xem các sao thụ đắc Tứ Hóa bẩm sinh này đang đóng ở các cung vị nào của đương số và luận giải sướng khổ tương ứng. Đặc biệt xới sâu Hóa Lộc (kho tài nguyên vũ trụ ban tặng) và Hóa Kỵ (ải nợ nần, ám ảnh sợ hãi, vết sẹo dằn vặt thẳm sâu).
   Đồng thời phân tích tối thiểu 02 đường phóng Tự Phi Tứ Hóa của các cung then chốt (Cung Mệnh, Cung Tài, Cung Quan) xem chúng tự phi Lộc hay phi Kỵ đi đâu để thấy hành trình luân chuyển dòng khí đời người.

3. **ẢNH HƯỞNG CỦA CÁC ĐỒNG CUNG & SÁT TINH TƯƠNG TÁC CHIẾN LƯỢC**:
   Phát giác và cô lột sự tàn phá của các Sát Tinh hiểm yếu (Địa Không, Địa Kiếp, Kình Dương, Đà La, Hỏa Tinh, Linh Tinh) đóng trên mệnh bàn đương số. Xét mối liên kết Nhị Hợp hoặc Lục Hại của cung bị ám để xem các cơn sóng dữ ngầm rạn nứt phát triển thế nào. Chỉ ra bí quyết tự nén mình cải tâm sửa nết để hóa hung thành cát một cách khoa học thực hành.

4. **VẬN TRÌNH ĐẠI VẬN 10 NĂM & LUẬN TIỂU HẠN NĂM NĂM ĐƯƠNG KIM ${chartData.transitYear || 2026}**:
   Luận đoán Đại vận đương đi dựa vào sự thịnh suy can chi của cung vị Đại hạn đó. 
   Sau đó đi phân tích sâu sắc năm xem vận hạn ${chartData.transitYear || 2026}. Bạn PHẢI tìm kiếm chính xác các Sao Lưu niên (đã được đánh dấu có tiền tố \`[SAO LƯU]\` trong mảng dữ liệu star chi tiết của cung vị như: Lưu Thái Tuế, Lưu Lộc Tồn, Lưu Tang Môn, Lưu Bạch Hổ, Lưu Thiên Mã, Lưu Kình, Lưu Đà, Lưu Khốc, Lưu Hư) để chỉ rõ: Năm nay súng đạn biến thiên sẽ nổ ra ở cung vị nào? Thị phi, dời nhà cửa thăng trầm hay lộc tiền mặt, hỷ tín tang gia hiển lộ cụ thể ra sao cực kỳ đời thực.

5. **CUNG PHU THÊ & THẾ THIÊN SÁT GIA ĐẠO: ĐỐI THOẠI KHẮC-HỢP**:
   Sử dụng Cung Phu Thê làm trục chính kết hợp Tam Phương Tứ Chính (cung đối Quan Lộc, và các cung tam hợp vây quanh) để vạch trần mong đợi bẩm sinh của đương số về bạn đời hay xu thế áp đặt, khuyết tật ứng xử làm rạn vỡ gia đạo. Chỉ vẽ con đường đôi bên cùng thấu hiểu, nương tựa dịu hiền.

6. **SỬC KHỎE TẬT ÁCH & THIÊN DI PHỊ HẠN CHỦ ĐỘNG PHÒNG NGỪA**:
   Phân tích Cung Tật Ách song chiếu cùng Thiên Di và quan hệ Nhị Hợp, Lục hại rình rập để khuyên bảo đương số phòng ngừa hao tổn sinh căn lực lượng, dịch chuyển xuất ngoại chủ động phòng trừ nguy biến pháp lý tai ương.

Văn phong trình bày bằng Markdown gọn gàng, súc mộc nhưng đanh thép học thuật tột bậc. Mở đầu bằng một câu nói trực diện đầy uy lực xoáy sâu thẳng thắn nhân tính, từ ngữ thấu tỏ hiện đại và tâm can thực thụ của một danh sư hữu tâm!`;

      // Helper function to call Gemini with retries and alternate model rotation to mitigate 503/429 transient errors
      const callGeminiWithFallback = async (aiInstance: any, primaryModel: string, promptText: string) => {
        const modelsSequence = [primaryModel];

        // Ensure both flash models can substitute each other
        if (primaryModel === "gemini-3.5-flash") {
          modelsSequence.push("gemini-3.1-flash-lite");
          modelsSequence.push("gemini-flash-latest");
        } else {
          modelsSequence.push("gemini-3.5-flash");
          modelsSequence.push("gemini-flash-latest");
        }

        let finalError: any = null;

        for (const targetModel of modelsSequence) {
          const maxAttempts = 2;
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              console.log(`Sending prompt to Gemini using model: '${targetModel}' (Attempt ${attempt}/${maxAttempts})...`);
              const response = await aiInstance.models.generateContent({
                model: targetModel,
                contents: promptText,
              });

              if (response && response.text) {
                return {
                  text: response.text,
                  modelUsed: targetModel,
                  fallbackApplied: targetModel !== primaryModel,
                };
              }
            } catch (err: any) {
              finalError = err;
              const errBodyString = typeof err === "string" 
                ? err 
                : ((err.message || "") + " " + JSON.stringify(err)).toLowerCase();
              
              console.warn(`Attempt ${attempt} with model ${targetModel} failed: ${errBodyString}`);

              // Non-transient errors (like API keys auth failure or bad request) should abort immediately
              const isTransient =
                errBodyString.includes("503") ||
                errBodyString.includes("unavailable") ||
                errBodyString.includes("429") ||
                errBodyString.includes("limit") ||
                errBodyString.includes("quota") ||
                errBodyString.includes("overloaded") ||
                errBodyString.includes("demand") ||
                errBodyString.includes("depleted") ||
                errBodyString.includes("temp") ||
                errBodyString.includes("resource_exhausted") ||
                errBodyString.includes("busy");

              if (!isTransient) {
                console.error("Non-transient error detected. Aborting rotation sequence.");
                throw err;
              }

              // Apply exponential backoff delay before retrying
              if (attempt < maxAttempts) {
                const backoffDelay = attempt * 1200;
                await new Promise((resolve) => setTimeout(resolve, backoffDelay));
              }
            }
          }
          console.warn(`Model ${targetModel} failed all attempts. Rotating to next candidate in sequence.`);
        }

        throw finalError;
      };

      // Call external function to generate content
      const resultObj = await callGeminiWithFallback(ai, modelName, prompt);

      res.json({
        interpretation: resultObj.text,
        modelUsed: resultObj.modelUsed,
        fallbackApplied: resultObj.fallbackApplied
      });
    } catch (error: any) {
      console.error("Lỗi luận giải Tử Vi:", error);
      const rawMsg = typeof error === "string" 
        ? error 
        : (error.message || JSON.stringify(error) || "Lỗi xử lý luận giải trên máy chủ.");
      let errMsg = rawMsg;
      let isRateLimit = false;
      let isApiKeyError = false;
      let retryAfter = 30;

      const lowerRawMsg = rawMsg.toLowerCase();
      
      // Look for specific Gemini API Key authentication or permission errors
      if (
        lowerRawMsg.includes("api key not valid") ||
        lowerRawMsg.includes("api_key_invalid") ||
        lowerRawMsg.includes("invalid api key") ||
        lowerRawMsg.includes("key not found") ||
        lowerRawMsg.includes("forbidden") ||
        lowerRawMsg.includes("unauthorized") ||
        lowerRawMsg.includes("api key is invalid") ||
        lowerRawMsg.includes("api key has expired")
      ) {
        isApiKeyError = true;
        errMsg = `Khóa API Gemini (BYOK) bạn đã nhập không hợp lệ, bị cấm truy cập, hoặc đã hết hạn.\n\n` +
          `👉 **HƯỚNG DẪN KHẮC PHỤC NHANH TRONG 1 PHÚT:**\n` +
          `1. **Kiểm tra khoảng trắng & ký tự:** Hãy chắc chắn bạn đã sao chép đủ toàn bộ chuỗi ký tự (thường dài khoảng 39 ký tự bắt đầu bằng 'AIzaSy...'). Đảm bảo không copy bị thừa khoảng trắng.\n` +
          `2. **Thời gian kích hoạt:** Khóa API mới tạo ở Google AI Studio đôi khi cần từ 30 giây đến 1 phút để được hệ thống toàn cầu của Google đồng bộ hiệu lực.\n` +
          `3. **Tạo mới khóa:** Hãy vào lại **Google AI Studio** tại địa chỉ **https://aistudio.google.com/**, bấm vào 'Get API Key', tạo một khóa mới tinh và dán đè lên hộp phía trên.\n` +
          `4. **Mẹo sử dụng:** Nếu không có khóa cá nhân, bạn có thể xóa toàn bộ chữ trong ô nhập API Key ở thanh màu sẫm và bấm 'Lưu' để hệ thống tự sử dụng luồng xử lý mặc định của máy chủ.`;
      } else if (
        rawMsg.includes("RESOURCE_EXHAUSTED") || 
        rawMsg.includes("quota") || 
        rawMsg.includes("429") || 
        rawMsg.toLowerCase().includes("limit") ||
        rawMsg.toLowerCase().includes("unavailable") ||
        rawMsg.includes("503")
      ) {
        isRateLimit = true;
        const secondsMatch = rawMsg.match(/retry in\s+([0-9.]+)\s*s/i);
        const delayMatch = rawMsg.match(/retryDelay:\s*"(\d+)/i);
        if (secondsMatch) {
          retryAfter = Math.ceil(parseFloat(secondsMatch[1]));
        } else if (delayMatch) {
          retryAfter = parseInt(delayMatch[1], 10);
        }

        errMsg = `Hệ thống nhận thấy số lượng yêu cầu hoặc máy chủ đang vượt quá hạn mức lượt dùng (Quota / Rate Limit) tạm thời từ model chính.\n\n` +
          `👉 **GIẢI PHÁP LẬP TỨC:**\n` +
          `1. Hãy đợi khoảng ${retryAfter} giây rồi bấm nút 'Khởi động AI Luận Giải Tử Vi' để gửi lại (bộ đếm màn hình tự động hiển thị).\n` +
          `2. **Lách nghẽn tự động:** Chúng tôi đã thử kích hoạt xoay vòng sang các mô hình dự phòng bao gồm **Gemini 3.1 Flash Lite** và **Gemini Flash Latest**.\n` +
          `3. **Độc lập vĩnh viễn:** Quý vị hãy điền khóa API Gemini chính chủ vào hộp **Nhập API Key cá nhân (BYOK)** ở thanh màu tối trên cùng để sở hữu luồng xử lý riêng biệt từ Google AI Studio, hoàn toàn miễn phí, nhanh chóng và không bao giờ gặp tình trạng quá tải chung này.`;
      }
      
      res.status(500).json({ 
        error: errMsg, 
        rateLimited: isRateLimit, 
        apiKeyError: isApiKeyError,
        retryAfter: retryAfter,
        rawMessage: rawMsg 
      });
    }
  });

  // Serve static assets in production, and run Vite devserver in dev mode
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on port ${PORT}`);
  });
}

startServer();

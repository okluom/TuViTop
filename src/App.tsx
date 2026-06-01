import React from "react";
import { 
  Compass, 
  User, 
  MapPin, 
  Calendar, 
  Sparkles, 
  AlertTriangle, 
  Trash2, 
  Clock, 
  Users, 
  Moon, 
  Save, 
  FileCheck, 
  Download,
  Info
} from "lucide-react";
import { BirthInput, SavedProfile, BirthplaceRegion } from "./types";
import { generateTuviAstrolabe, calculateTransitInfo, EARTHLY_BRANCHES } from "./utils/tuvi";
import { HoroscopeChart } from "./components/HoroscopeChart";
import { AIInterpreter } from "./components/AIInterpreter";

export default function App() {
  // Input fields state
  const [profileName, setProfileName] = React.useState<string>("");
  const [solarDate, setSolarDate] = React.useState<string>("1995-10-25");
  const [solarTime, setSolarTime] = React.useState<string>("12:30");
  const [birthplace, setBirthplace] = React.useState<BirthplaceRegion>("Miền Nam VN");
  const [gender, setGender] = React.useState<"Nam" | "Nữ">("Nam");
  const [apiKey, setApiKey] = React.useState<string>("");
  const [modelSelection, setModelSelection] = React.useState<"gemini-3.5-flash" | "gemini-3.1-flash-lite">("gemini-3.5-flash");
  const [transitYear, setTransitYear] = React.useState<number>(2026);
  const [retryCountdown, setRetryCountdown] = React.useState<number>(0);

  // Split solarDate (YYYY-MM-DD) into day, month, year for custom D/M/Y selectors
  const dateParts = React.useMemo(() => {
    if (!solarDate) return { day: "25", month: "10", year: "1995" };
    const parts = solarDate.split("-");
    if (parts.length === 3) {
      return {
        year: parts[0],
        month: parts[1], // "01", "02", ..., "12"
        day: parts[2]    // "01", "02", ..., "31"
      };
    }
    return { day: "25", month: "10", year: "1995" };
  }, [solarDate]);

  const handleDayChange = (newDay: string) => {
    const formattedDay = newDay.padStart(2, "0");
    setSolarDate(`${dateParts.year}-${dateParts.month}-${formattedDay}`);
  };

  const handleMonthChange = (newMonth: string) => {
    const formattedMonth = newMonth.padStart(2, "0");
    setSolarDate(`${dateParts.year}-${formattedMonth}-${dateParts.day}`);
  };

  const handleYearChange = (newYear: string) => {
    const cleanYear = newYear.replace(/\D/g, "");
    setSolarDate(`${cleanYear}-${dateParts.month}-${dateParts.day}`);
  };

  const formatToVietnameseDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  React.useEffect(() => {
    if (retryCountdown <= 0) return;
    const interval = setInterval(() => {
      setRetryCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [retryCountdown]);

  // Output calculated result state
  const [calculated, setCalculated] = React.useState<any | null>(null);
  
  // AI readings state
  const [interpretation, setInterpretation] = React.useState<string | null>(null);
  const [aiLoading, setAiLoading] = React.useState<boolean>(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  // Saved Profiles list
  const [savedProfiles, setSavedProfiles] = React.useState<SavedProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = React.useState<string | null>(null);

  // Load API key and stored profiles on mount
  React.useEffect(() => {
    const savedKey = localStorage.getItem("tuvi_byok_key");
    if (savedKey) {
      setApiKey(savedKey);
    }
    
    const storedProfiles = localStorage.getItem("tuvi_profiles");
    if (storedProfiles) {
      try {
        setSavedProfiles(JSON.parse(storedProfiles));
      } catch (e) {
        console.error("Lỗi parse dữ liệu hồ sơ đã lưu:", e);
      }
    }

    // Default calculations on mount
    triggerCalculation("Hồ Sơ Mẫu", "1995-10-25", "12:30", "Miền Nam VN", "Nam");
  }, []);

  // Compute standard Tuvi chart details
  const triggerCalculation = (
    nameVal: string, 
    dateVal: string, 
    timeVal: string, 
    placeVal: BirthplaceRegion, 
    genderVal: "Nam" | "Nữ"
  ) => {
    try {
      const result = generateTuviAstrolabe(dateVal, timeVal, placeVal, genderVal);
      setCalculated(result);
      setInterpretation(null); // Reset AI readings on model recalculations
      setAiError(null);
    } catch (error: any) {
      alert(`Lỗi khi tạo lá số: ${error?.message || error}`);
    }
  };

  const handleCalculateClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      alert("Vui lòng điền tên chủ nhân lá số.");
      return;
    }
    const yearNum = parseInt(dateParts.year, 10);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      alert("Vui lòng nhập năm sinh hợp lệ trong khoảng 1900 - 2100.");
      return;
    }
    triggerCalculation(profileName, solarDate, solarTime, birthplace, gender);
  };

  // Profile Storage helpers
  const handleSaveProfile = () => {
    if (!profileName.trim()) return;

    const newProfile: SavedProfile = {
      id: crypto.randomUUID(),
      name: profileName,
      solarDate,
      solarTime,
      birthplace,
      gender,
      modelSelection,
      createdAt: new Date().toLocaleDateString("vi-VN"),
    };

    const updated = [newProfile, ...savedProfiles.filter(p => p.name !== profileName)];
    setSavedProfiles(updated);
    localStorage.setItem("tuvi_profiles", JSON.stringify(updated));
    setActiveProfileId(newProfile.id);
  };

  const handleSelectProfile = (p: SavedProfile) => {
    setProfileName(p.name);
    setSolarDate(p.solarDate);
    setSolarTime(p.solarTime);
    setBirthplace(p.birthplace);
    setGender(p.gender);
    setActiveProfileId(p.id);
    triggerCalculation(p.name, p.solarDate, p.solarTime, p.birthplace, p.gender);
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedProfiles.filter(p => p.id !== id);
    setSavedProfiles(updated);
    localStorage.setItem("tuvi_profiles", JSON.stringify(updated));
    if (activeProfileId === id) {
      setActiveProfileId(null);
    }
  };

  // Run Gemini analysis via local server route proxy
  const handleTriggerInterpret = async () => {
    if (!calculated) return;

    setAiLoading(true);
    setAiError(null);
    setInterpretation(null);

    // Build payload to send
    const chart = calculated.chart;
    const birthYear = new Date(calculated.timezoneNormalization.normalizedDate).getFullYear();
    const birthBranchIndex = ((birthYear - 4) % 12 + 12) % 12;
    const birthZodiacName = EARTHLY_BRANCHES[birthBranchIndex];

    const transitInfo = calculateTransitInfo(
      birthYear,
      birthZodiacName,
      chart.gender,
      chart.palaces,
      transitYear
    );

    const formattedPayload = {
      solarDate: calculated.timezoneNormalization.originalDate,
      solarTime: calculated.timezoneNormalization.originalTime,
      lunarDate: chart.lunarDate,
      chineseDate: chart.chineseDate,
      gender: chart.gender,
      fiveElementsClass: chart.fiveElementsClass,
      zodiac: chart.zodiac,
      sign: chart.sign,
      soul: chart.soul,
      body: chart.body,
      // Transit metrics
      transitYear: transitYear,
      transitLunarAge: transitInfo.lunarAge,
      transitDecadalPalace: transitInfo.daiHanPalaceName,
      transitYearlyPalace: transitInfo.tieuHanPalaceName,
      transitLuuThaiTuePalace: transitInfo.luuNienThaiTueName,
      // Inject Sao Luu into palaces dynamic stars lists
      palaces: chart.palaces.map((p: any) => {
        const localSaoLuu = transitInfo.saoLuuMap[p.index] || [];
        return {
          index: p.index,
          name: p.name,
          earthlyBranch: p.earthlyBranch,
          heavenlyStem: p.heavenlyStem,
          isBodyPalace: p.isBodyPalace,
          changsheng12: p.changsheng12,
          decadal: {
            range: p.decadal.range,
          },
          majorStars: p.majorStars.map((s: any) => ({ name: s.name, brightness: s.brightness })),
          minorStars: [
            ...p.minorStars.map((s: any) => ({ name: s.name })),
            ...localSaoLuu.map((s: string) => ({ name: `[SAO LƯU] ${s}` }))
          ],
          adjectiveStars: p.adjectiveStars.map((s: any) => ({ name: s.name, type: s.type })),
        };
      }),
    };

    try {
      const response = await fetch("/api/interpret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chartData: formattedPayload,
          customApiKey: apiKey.trim(),
          modelSelection: modelSelection,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.rateLimited && data.retryAfter) {
          setRetryCountdown(data.retryAfter);
        }
        throw new Error(data.error || "Lỗi bất định từ dịch vụ AI.");
      }

      setInterpretation(data.interpretation);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Không thể kết nối với máy chủ AI luận giải.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-neutral-950 text-stone-900 dark:text-neutral-150 font-sans antialiased pb-20">
      
      {/* Decorative Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-stone-900/95 text-white border-b border-stone-850 p-4 scrollbar-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-stone-950 p-2 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wider flex items-center gap-2">
                TỬ VI ĐẨU SỐ <span className="text-[10px] bg-red-600 px-1.5 py-0.5 rounded text-white tracking-widest font-bold">BẢN MỆNH AI</span>
              </h1>
              <p className="text-[10px] text-stone-400 font-medium">
                Tính toán Lịch Học chính xác theo TuviGLOBAL & Múi giờ Lịch sử VN • <span className="text-amber-400 font-bold tracking-wider font-mono">by khackhoa</span>
              </p>
            </div>
          </div>

          <div className="flex gap-4 text-xs text-stone-300">
            <p className="flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-amber-400 shrink-0" />
              Độ chính xác thiên văn cao
            </p>
            <p className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
              Múi giờ Hà Nội (GMT+7)
            </p>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column (Form & Saved Profiles): grid span 4 */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Main birth inputs card */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-stone-250 dark:border-neutral-800 shadow-lg space-y-5">
            <div className="border-b border-stone-200 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-extrabold tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
                <Compass className="w-4.5 h-4.5 text-indigo-600" />
                Thiết Lập Thông Tin Sinh Mệnh
              </h2>
              <p className="text-[11px] text-stone-400 mt-1">
                Vui lòng cung cấp giờ sinh dương lịch. Thuật toán sẽ tự căn chỉnh múi giờ lịch sử và tra bảng TuviGLOBAL chính tông.
              </p>
            </div>

            <form onSubmit={handleCalculateClick} className="space-y-4">
              {/* Name field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  Họ và tên
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Châu Khắc Khoa"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full text-sm bg-stone-50 dark:bg-neutral-950 border border-stone-250 dark:border-neutral-800 focus:border-indigo-500 focus:outline-none rounded-xl p-3 text-stone-900 dark:text-white"
                  required
                />
              </div>

              {/* Gender and Region row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-600 dark:text-stone-300">
                    Giới tính
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-stone-100 dark:bg-neutral-950 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setGender("Nam")}
                      className={`text-xs py-2 font-bold rounded-lg transition-colors ${
                        gender === "Nam"
                          ? "bg-indigo-650 text-white shadow-sm"
                          : "text-stone-500 hover:text-stone-855"
                      }`}
                    >
                      Nam
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender("Nữ")}
                      className={`text-xs py-2 font-bold rounded-lg transition-colors ${
                        gender === "Nữ"
                          ? "bg-indigo-650 text-white shadow-sm"
                          : "text-stone-500 hover:text-stone-855"
                      }`}
                    >
                      Nữ
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    Địa danh sinh
                  </label>
                  <select
                    value={birthplace}
                    onChange={(e) => setBirthplace(e.target.value as BirthplaceRegion)}
                    className="w-full text-xs font-bold bg-stone-50 dark:bg-neutral-950 border border-stone-250 dark:border-neutral-800 focus:border-indigo-500 focus:outline-none p-[11px] rounded-xl text-stone-800 dark:text-white"
                  >
                    <option value="Miền Nam VN">Miền Nam VN</option>
                    <option value="Miền Trung VN (Vĩ tuyến 17 trở vào: Huế, Đà Nẵng, Khánh Hòa...)">Miền Trung (Quảng Trị trở vào)</option>
                    <option value="Miền Trung VN (Vĩ tuyến 17 trở ra: Thanh Hóa, Nghệ An, Hà Tĩnh, Quảng Bình)">Miền Trung (Quảng Bình trở ra)</option>
                    <option value="Miền Bắc VN / Khác">Miền Bắc VN / Khác</option>
                    <option value="Nước ngoài (Quy đổi GMT+7)">Nước ngoài (Quy đổi GMT+7)</option>
                  </select>
                </div>
              </div>

              {/* Solar Date and Time row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    Ngày Dương lịch
                  </label>
                  <input
                    type="date"
                    value={solarDate}
                    onChange={(e) => setSolarDate(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 dark:bg-neutral-950 border border-stone-250 dark:border-neutral-800 focus:border-indigo-500 focus:outline-none p-2.5 rounded-xl text-stone-800 dark:text-white mt-1.5 min-h-[40px]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    Giờ Sinh gốc
                  </label>
                  <input
                    type="time"
                    value={solarTime}
                    onChange={(e) => setSolarTime(e.target.value)}
                    className="w-full text-xs font-bold bg-stone-50 dark:bg-neutral-950 border border-stone-250 dark:border-neutral-800 focus:border-indigo-500 focus:outline-none p-2.5 rounded-xl text-stone-800 dark:text-white mt-1.5 min-h-[40px]"
                    required
                  />
                </div>
              </div>

              {/* Submit calculations button */}
              <button
                type="submit"
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold p-3.5 rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 border border-stone-800 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                <Compass className="w-4 h-4 text-amber-500 animate-spin-slow" />
                Thắp Sao Lập Lá Số
              </button>
            </form>
          </div>

          {/* Stored user profile manager */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-stone-250 dark:border-neutral-800 shadow-md space-y-4">
            <h3 className="text-sm font-extrabold tracking-tight text-stone-900 dark:text-white flex items-center gap-2 border-b border-stone-200 dark:border-neutral-800 pb-2">
              <Users className="w-4.5 h-4.5 text-indigo-650" />
              Sổ Tay Hồ Sơ Bản Mệnh ({savedProfiles.length})
            </h3>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {savedProfiles.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectProfile(p)}
                  className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${
                    activeProfileId === p.id
                      ? "bg-indigo-50/50 border-indigo-300 text-indigo-900 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400"
                      : "bg-stone-50 dark:bg-neutral-955 border-stone-200 dark:border-neutral-800 hover:bg-stone-100"
                  }`}
                >
                  <div className="space-y-0.5 text-left">
                    <p className="font-bold text-xs">{p.name} ({p.gender})</p>
                    <p className="text-[10px] text-stone-400 font-medium">
                      {formatToVietnameseDate(p.solarDate)} • {p.solarTime} • {p.birthplace === "Miền Nam VN" ? "M.Nam" : p.birthplace.includes("Miền Trung") ? "M.Trung" : p.birthplace.includes("Nước ngoài") ? "N.Ngoài" : "M.Bắc"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteProfile(p.id, e)}
                    className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-200/50 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {savedProfiles.length === 0 && (
                <div className="p-8 text-center text-stone-400 space-y-1">
                  <Users className="w-6 h-6 mx-auto text-stone-300" />
                  <p className="text-xs font-medium">Chưa có hồ sơ nào được lưu</p>
                  <p className="text-[10px]">Cung cấp thông tin sinh, thắp sao lập lá số, sau đó ấn "Lưu Hồ Sơ Nhân Vật" để ghi nhớ.</p>
                </div>
              )}
            </div>

            {/* General instruction helper */}
            <div className="text-[10px] text-stone-400 leading-normal p-2.5 bg-stone-50 dark:bg-neutral-950 rounded-lg border border-stone-200 dark:border-neutral-800 flex items-start gap-1.5">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p>
                <strong>Tử Vi Đẩu Số</strong> là khoa lập pháp nghiên cứu chu kỳ tinh tú. Sự chính xác của giờ Tý biên cải theo từng tháng âm lịch chính là tinh hoa cốt tủy loại bỏ sai sót mà TuviGLOBAL đề xướng và KhacKhoa nâng cấp.
              </p>
            </div>
          </div>

        </div>

        {/* Right column (Visual Horoscope grid list & AI panels): grid span 8 */}
        <div className="lg:col-span-8 space-y-8">
          {calculated ? (
            <>
              {/* Palace map layout */}
              <div className="space-y-2 text-left">
                <div className="flex justify-between items-center px-1">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <FileCheck className="w-5 h-5 text-indigo-650" />
                      Lá Số Tử Vi Thiên Bàn
                    </h2>
                    <p className="text-xs text-stone-400">
                      Bản đồ an sao và thế đứng nhị hợp tam tai toàn diện
                    </p>
                  </div>
                  
                  <span className="text-xs bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 px-3 py-1 rounded-full font-bold">
                    Khung Trục Mệnh
                  </span>
                </div>

                <HoroscopeChart 
                  calculated={calculated} 
                  profileName={profileName || "Hồ Sơ Mẫu"} 
                  onSaveProfile={handleSaveProfile}
                  isSaved={savedProfiles.some(p => p.name === profileName && p.solarDate === solarDate && p.solarTime === solarTime)}
                  transitYear={transitYear}
                  setTransitYear={setTransitYear}
                />
              </div>

              {/* AI interpretation layer */}
              <AIInterpreter
                interpretation={interpretation}
                isLoading={aiLoading}
                error={aiError}
                onTriggerInterpret={handleTriggerInterpret}
                apiKey={apiKey}
                setApiKey={setApiKey}
                modelSelection={modelSelection}
                setModelSelection={setModelSelection}
                retryCountdown={retryCountdown}
              />
            </>
          ) : (
            <div className="p-20 text-center text-stone-400 space-y-4 bg-white dark:bg-neutral-900 rounded-3xl border border-stone-200 dark:border-neutral-800">
              <Compass className="w-12 h-12 mx-auto text-indigo-600 animate-spin-slow" />
              <div className="space-y-1 max-w-sm mx-auto">
                <p className="font-bold text-stone-800 dark:text-neutral-200 text-sm">Chưa có thông tin thiên bàn lập tinh</p>
                <p className="text-xs">
                  Điền đầy đủ ngày giờ sinh, giới tính và nơi sinh ở cột bên trái rồi ấn <strong>"Thắp Sao Lập Lá Số"</strong> để tiến hành kết xuất lá số mạng vận chi tiết.
                </p>
              </div>
            </div>
          )}
        </div>

      </main>

      <footer className="max-w-7xl mx-auto px-4 mt-16 pt-8 pb-12 border-t border-stone-250/60 dark:border-neutral-800/80 text-center text-xs text-stone-400 dark:text-neutral-500">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-semibold tracking-wide text-stone-500 dark:text-neutral-400">
            ỨNG DỤNG TỬ VI ĐẨU SỐ BẢN MỆNH AI © 2026
          </p>
          <p className="flex items-center gap-1.5 font-sans font-medium text-stone-500 dark:text-neutral-400">
            <span>Thiết kế & Phát triển:</span>
            <span className="px-2.5 py-1 text-[10px] rounded-lg bg-stone-100 dark:bg-neutral-900 border border-stone-250 dark:border-neutral-800 text-stone-700 dark:text-neutral-300 font-bold tracking-widest font-mono uppercase">
              by khackhoa
            </span>
          </p>
        </div>
      </footer>

    </div>
  );
}

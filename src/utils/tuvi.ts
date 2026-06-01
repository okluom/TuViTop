import { astro } from 'iztro';

// Offset minutes translation table for Tý hour by Lunar Month (1 to 12)
// This value is the offset in minutes relative to the standard start of Tý (23:00)
// Month 1: 23:30 (offset +30)
// Month 2: 23:40 (offset +40)
// Month 3: 23:50 (offset +50)
// Month 4: 00:00 (offset +60)
// Month 5: 00:10 (offset +70)
// Month 6: 00:00 (offset +60)
// Month 7: 23:50 (offset +50)
// Month 8: 23:40 (offset +40)
// Month 9: 23:30 (offset +30)
// Month 10: 23:20 (offset +20)
// Month 11: 23:10 (offset +10)
// Month 12: 23:20 (offset +20)
export const TUVI_GLOBAL_OFFSETS: Record<number, number> = {
  1: 30,
  2: 40,
  3: 50,
  4: 60,
  5: 70,
  6: 60,
  7: 50,
  8: 40,
  9: 30,
  10: 20,
  11: 10,
  12: 20,
};

export const EARTHLY_BRANCHES = [
  "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"
];

export interface TimezoneAdjustment {
  originalTime: string;
  originalDate: string;
  birthplace: string;
  normalizedDate: Date;
  timezoneLabel: string;
  note: string;
}

/**
 * Normalizes birth datetime into current Vietnamese timezone GMT+7 using historical rules
 */
export function normalizeToHanoi(dateStr: string, timeStr: string, birthplace: string): TimezoneAdjustment {
  const dtStr = `${dateStr}T${timeStr}:00`;
  const originalDate = new Date(dtStr);
  let adjustedDate = new Date(originalDate.getTime());
  let note = "Giữ nguyên múi giờ GMT+7.";
  let timezoneLabel = "GMT+7";

  const birthYear = originalDate.getFullYear();
  const birthMonth = originalDate.getMonth() + 1;
  const birthDay = originalDate.getDate();

  // Helper to compare dates
  const matchesRange = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    return originalDate >= start && originalDate <= end;
  };

  // Rule 1: 01/01/1943 to 31/03/1945 -- GMT+8 (Subtract 1 hour to get to GMT+7)
  if (matchesRange("1943-01-01T00:00:00", "1945-03-31T23:59:59")) {
    adjustedDate.setHours(adjustedDate.getHours() - 1);
    note = "Hiệu chỉnh lùi 1 giờ do thời kỳ này sử dụng múi giờ GMT+8.";
    timezoneLabel = "GMT+8 -> GMT+7";
  }
  // Rule 2: 01/04/1945 to 18/08/1945 -- GMT+9 (Subtract 2 hours to get to GMT+7)
  else if (matchesRange("1945-04-01T00:00:00", "1945-08-18T23:59:59")) {
    adjustedDate.setHours(adjustedDate.getHours() - 2);
    note = "Hiệu chỉnh lùi 2 giờ do thời kỳ chiến tranh thế giới thứ 2 sử dụng múi giờ Nhật Bản GMT+9.";
    timezoneLabel = "GMT+9 -> GMT+7";
  }
  // Rule 3: 01/01/1960 to 30/04/1975 -- Miền Nam Việt Nam & Miền Trung Vĩ tuyến 17 trở vào GMT+8 (Subtract 1 hour)
  else if (
    (birthplace === "Miền Nam VN" || birthplace === "Miền Trung VN (Vĩ tuyến 17 trở vào: Huế, Đà Nẵng, Khánh Hòa...)") && 
    matchesRange("1960-01-01T00:00:00", "1975-04-30T23:59:59")
  ) {
    adjustedDate.setHours(adjustedDate.getHours() - 1);
    note = "Hiệu chỉnh lùi 1 giờ ở Miền Nam / Miền Trung (vĩ tuyến 17 trở vào) từ 1960 đến 1975, do chế độ Sài Gòn quy định múi giờ GMT+8.";
    timezoneLabel = "GMT+8 -> GMT+7";
  }

  return {
    originalTime: timeStr,
    originalDate: dateStr,
    birthplace,
    normalizedDate: adjustedDate,
    timezoneLabel,
    note
  };
}

export interface HourResult {
  branchName: string;
  timeIndex: number; // 0 to 11 (or 12 for late Tý in intermediate states)
  rangeStr: string;
  warning: string | null;
  dateShift: number; // -1, 0, or +1 day shift required
}

/**
 * Computes exact earthly branch hour and warning using the TuviGLOBAL schedule (Hanoi GMT+7)
 */
export function getTuviGlobalTime(lunarMonth: number, date: Date): HourResult {
  const hour = date.getHours();
  const min = date.getMinutes();
  const timeMin = hour * 60 + min;

  const offset = TUVI_GLOBAL_OFFSETS[lunarMonth] || 0;
  let branchIndex = 0;
  let dateShift = 0;
  let rangeStr = "";
  let warning: string | null = null;

  // Let's find the boundaries of the hour slots
  if (offset < 60) {
    // Tý starts BEFORE midnight, e.g. at 23:30 (for M=1, offset=30)
    const lateTýStart = 1380 + offset; // e.g. 1410
    const earlyTýEnd = 60 + offset;    // e.g. 90

    if (timeMin >= lateTýStart) {
      // Born in late Tý, belongs to early hours of tomorrow
      branchIndex = 0; // Tý
      dateShift = 1;
      const prev = getFormattedTime(lateTýStart);
      const next = getFormattedTime(earlyTýEnd);
      rangeStr = `${prev} – ${next} (vắt sang ngày hôm sau)`;
      
      const dist = Math.abs(timeMin - lateTýStart);
      if (dist <= 15) {
        warning = `Sinh sáp giới mốc chuyển giờ Hợi sang Tý (${prev}). Hãy kiểm định với giờ Hợi (21:30 - 23:30).`;
      }
    } else if (timeMin < earlyTýEnd) {
      branchIndex = 0; // Tý
      dateShift = 0;
      const prev = getFormattedTime(lateTýStart);
      const next = getFormattedTime(earlyTýEnd);
      rangeStr = `${prev} – ${next} (vắt sang ngày hôm sau)`;

      const dist = Math.abs(timeMin - earlyTýEnd);
      if (dist <= 15) {
        warning = `Sinh sáp giới mốc chuyển giờ Tý sang Sửu (${next}). Hãy kiểm định với giờ Sửu (${next} - ${getFormattedTime(earlyTýEnd + 120)}).`;
      }
    } else {
      // Normal intervals (Sửu to Hợi)
      // i is slot index 1 to 11
      for (let i = 1; i <= 11; i++) {
        const start = (2 * i - 1) * 60 + offset;
        const end = (2 * i + 1) * 60 + offset;
        if (timeMin >= start && timeMin < end) {
          branchIndex = i;
          dateShift = 0;
          const sStr = getFormattedTime(start);
          const eStr = getFormattedTime(end);
          rangeStr = `${sStr} – ${eStr}`;

          const distStart = Math.abs(timeMin - start);
          const distEnd = Math.abs(timeMin - end);
          if (distStart <= 15) {
            warning = `Sinh sáp giới mốc chuyển giờ ${EARTHLY_BRANCHES[i-1]} sang ${EARTHLY_BRANCHES[i]} (${sStr}). Hãy kiểm định với giờ ${EARTHLY_BRANCHES[i-1]}.`;
          } else if (distEnd <= 15) {
            const nextBranch = EARTHLY_BRANCHES[(i + 1) % 12];
            warning = `Sinh sáp giới mốc chuyển giờ ${EARTHLY_BRANCHES[i]} sang ${nextBranch} (${eStr}). Hãy kiểm định với giờ ${nextBranch}.`;
          }
          break;
        }
      }
    }
  } else {
    // Tý starts AFTER midnight, e.g. at 00:10 (for M=5, offset=70)
    const earlyHợiEnd = offset - 60; // e.g. 10
    const earlyTýEnd = offset + 60;   // e.g. 130

    if (timeMin < earlyHợiEnd) {
      // Standard midnight but hasn't entered Tý yet, meaning it is still Hợi hour of PREVIOUS day!
      branchIndex = 11; // Hợi
      dateShift = -1;
      const prev = getFormattedTime(1380 + (offset - 60)); // 22:10 of previous day
      const next = getFormattedTime(earlyHợiEnd);          // 00:10 of current day
      rangeStr = `${prev} – ${next} (kéo dài qua 00h)`;

      const dist = Math.abs(timeMin - earlyHợiEnd);
      if (dist <= 15) {
        warning = `Sinh sáp giới mốc chuyển giờ Hợi sang Tý (${next}). Hãy kiểm định với giờ Tý (${next} - ${getFormattedTime(earlyTýEnd)}).`;
      }
    } else {
      // Normal intervals from Tý (starts at offset - 60)
      const startOfTý = offset - 60;
      if (timeMin >= startOfTý && timeMin < startOfTý + 120) {
        branchIndex = 0; // Tý
        dateShift = 0;
        const sStr = getFormattedTime(startOfTý);
        const eStr = getFormattedTime(startOfTý + 120);
        rangeStr = `${sStr} – ${eStr}`;

        const distStart = Math.abs(timeMin - startOfTý);
        const distEnd = Math.abs(timeMin - (startOfTý + 120));
        if (distStart <= 15) {
          const prevBranch = EARTHLY_BRANCHES[11];
          warning = `Sinh sáp giới mốc chuyển giờ ${prevBranch} sang Tý (${sStr}). Hãy kiểm định với giờ ${prevBranch}.`;
        } else if (distEnd <= 15) {
          const nextBranch = EARTHLY_BRANCHES[1];
          warning = `Sinh sáp giới mốc chuyển giờ Tý sang ${nextBranch} (${eStr}). Hãy kiểm định với giờ ${nextBranch}.`;
        }
      } else {
        // Other slots (1 to 11)
        for (let i = 1; i <= 11; i++) {
          const start = (2 * i - 1) * 60 + offset;
          const end = (2 * i + 1) * 60 + offset;
          if (timeMin >= start && timeMin < end) {
            branchIndex = i;
            dateShift = 0;
            const sStr = getFormattedTime(start);
            const eStr = getFormattedTime(end);
            rangeStr = `${sStr} – ${eStr}`;

            const distStart = Math.abs(timeMin - start);
            const distEnd = Math.abs(timeMin - end);
            if (distStart <= 15) {
              warning = `Sinh sáp giới mốc chuyển giờ ${EARTHLY_BRANCHES[i-1]} sang ${EARTHLY_BRANCHES[i]} (${sStr}). Hãy kiểm định với giờ ${EARTHLY_BRANCHES[i-1]}.`;
            } else if (distEnd <= 15) {
              const nextBranch = EARTHLY_BRANCHES[(i + 1) % 12];
              warning = `Sinh sáp giới mốc chuyển giờ ${EARTHLY_BRANCHES[i]} sang ${nextBranch} (${eStr}). Hãy kiểm định với giờ ${nextBranch}.`;
            }
            break;
          }
        }
      }
    }
  }

  return {
    branchName: EARTHLY_BRANCHES[branchIndex],
    timeIndex: branchIndex,
    rangeStr,
    warning,
    dateShift
  };
}

function getFormattedTime(totalMinutes: number): string {
  // Safe bounds
  const relativeMin = (totalMinutes + 1440) % 1440;
  const h = Math.floor(relativeMin / 60);
  const m = relativeMin % 60;
  return `${h.toString().padStart(2, '0')}h${m.toString().padStart(2, '0')}`;
}

/**
 * Executes a dual-pass birth astrolabe generation resolving both solar/lunar month alignment
 * and exact astronomical hours correct under TuviGLOBAL standards.
 */
export function generateTuviAstrolabe(
  solarDateStr: string, // "YYYY-MM-DD"
  solarTimeStr: string, // "HH:MM"
  birthplace: string,   // "Miền Nam VN" | "Miền Trung VN..." | "Miền Bắc VN..." | "Nước ngoài..."
  gender: 'Nam' | 'Nữ'
) {
  // Step 1: Normalize history time
  const norm = normalizeToHanoi(solarDateStr, solarTimeStr, birthplace);
  const normDate = norm.normalizedDate;

  const yVal = normDate.getFullYear();
  const mVal = normDate.getMonth() + 1;
  const dVal = normDate.getDate();

  // Step 2: Pass 1 on dummy Ngọ hour (6) to extract approximation of lunar month
  const firstPassDateStr = `${yVal}-${mVal.toString().padStart(2, '0')}-${dVal.toString().padStart(2, '0')}`;
  const firstPass = astro.bySolar(firstPassDateStr, 6, gender === 'Nam' ? 'Nam' : 'Nữ', true, 'vi-VN');
  
  const approxLunarMonth = firstPass.rawDates.lunarDate.lunarMonth;

  // Step 3: Align hours using TuviGLOBAL monthly guidelines and potential date-shifts
  const matchedHour = getTuviGlobalTime(approxLunarMonth, normDate);

  // Apply potential date-shifts based on TuviGLOBAL late Tý or early morning Hợi shifts
  let finalAstroDate = new Date(normDate.getTime());
  if (matchedHour.dateShift === 1) {
    finalAstroDate.setDate(finalAstroDate.getDate() + 1);
  } else if (matchedHour.dateShift === -1) {
    finalAstroDate.setDate(finalAstroDate.getDate() - 1);
  }

  const fy = finalAstroDate.getFullYear();
  const fm = finalAstroDate.getMonth() + 1;
  const fd = finalAstroDate.getDate();
  const finalSolarPassStr = `${fy}-${fm.toString().padStart(2, '0')}-${fd.toString().padStart(2, '0')}`;

  // Step 4: Final Pass computing full star chart using exact aligned hour index
  const finalChart = astro.bySolar(
    finalSolarPassStr,
    matchedHour.timeIndex,
    gender === 'Nam' ? 'Nam' : 'Nữ',
    true,
    'vi-VN'
  );

  return {
    timezoneNormalization: norm,
    tuviGlobalHourResult: matchedHour,
    finalSolarDateUsed: finalSolarPassStr,
    approxLunarMonth,
    chart: finalChart
  };
}

export interface TransitResult {
  transitYear: number;
  lunarAge: number;
  daiHanPalaceIndex: number; // 0..11
  daiHanPalaceName: string;
  tieuHanPalaceIndex: number; // 0..11
  tieuHanPalaceName: string;
  luuNienThaiTueIndex: number; // 0..11
  luuNienThaiTueName: string;
  saoLuuMap: Record<number, string[]>; // palaceIndex -> list of Sao Luu names e.g. ["Lưu Thái Tuế", "Lưu Lộc Tồn"]
}

export function calculateTransitInfo(
  birthYear: number,
  birthZodiac: string, // e.g. "Tý", "Sửu", ..., matching EARTHLY_BRANCHES
  gender: "Nam" | "Nữ",
  palaces: any[], // 12 palaces
  transitYear: number
): TransitResult {
  const lunarAge = transitYear - birthYear + 1;

  // 1. Find Dai Han (Major 10-year limit)
  let daiHanPalaceIndex = 0;
  let daiHanPalaceName = "";
  palaces.forEach((p) => {
    const range = p.decadal?.range;
    if (range && lunarAge >= range[0] && lunarAge <= range[1]) {
      daiHanPalaceIndex = p.index;
      daiHanPalaceName = p.name;
    }
  });

  // 2. Find Luu Nien Thai Tue
  // Luu Nien Thai Tue matches the earthly branch of the transitYear.
  // branchIndex = (transitYear - 4) % 12 (since index 4 is Thìn, which corresponds to (2024 - 4) % 12)
  const luuNienBranchIndex = ((transitYear - 4) % 12 + 12) % 12;
  const luuNienThaiTueIndex = luuNienBranchIndex;
  let luuNienThaiTueName = "";
  palaces.forEach((p) => {
    if (p.index === luuNienBranchIndex) {
      luuNienThaiTueName = p.name;
    }
  });

  // 3. Find Tieu Han
  // A. Determine Starting Palace index of Tieu Han based on birthZodiac (which is the animal like Tý/Sửu/Dần...)
  // Map standard zoom grouping:
  // Dan - Ngo - Tuat (Dần, Ngọ, Tuất): start is Thin (index 4)
  // Than - Ty - Thin (Thân, Tý, Thìn): start is Tuat (index 10)
  // Ty - Dau - Suu (Tỵ, Dậu, Sửu): start is Mui (index 7)
  // Hoi - Mao - Mui (Hợi, Mão, Mùi): start is Suu (index 1)
  
  const branchNormalized = birthZodiac.trim();
  let startTieuHanIndex = 4; // default
  if (["Dần", "Ngọ", "Tuất"].includes(branchNormalized)) {
    startTieuHanIndex = 4; // Thìn
  } else if (["Thân", "Tý", "Thìn"].includes(branchNormalized)) {
    startTieuHanIndex = 10; // Tuất
  } else if (["Tỵ", "Dậu", "Sửu"].includes(branchNormalized)) {
    startTieuHanIndex = 7; // Mùi
  } else if (["Hợi", "Mão", "Mùi"].includes(branchNormalized)) {
    startTieuHanIndex = 1; // Sửu
  }

  // B. Move based on gender (Nam: clockwise, Nữ: counter-clockwise)
  let tieuHanPalaceIndex = 0;
  if (gender === "Nam") {
    // Clockwise
    tieuHanPalaceIndex = (startTieuHanIndex + (lunarAge - 1)) % 12;
  } else {
    // Counter-clockwise
    tieuHanPalaceIndex = (startTieuHanIndex - (lunarAge - 1) + 1200) % 12;
  }

  let tieuHanPalaceName = "";
  palaces.forEach((p) => {
    if (p.index === tieuHanPalaceIndex) {
      tieuHanPalaceName = p.name;
    }
  });

  // 4. Calculate Sao Luu mapping
  const saoLuuMap: Record<number, string[]> = {};
  for (let i = 0; i < 12; i++) {
    saoLuuMap[i] = [];
  }

  // A. Lưu Thái Tuế: Always in the Luu Nien Thai Tue palace
  saoLuuMap[luuNienBranchIndex].push("Lưu Thái Tuế");

  // B. Lưu Tang Môn & Lưu Bạch Hổ:
  // Lưu Tang Môn = (Lưu Thái Tuế + 2) % 12
  const luuTangMonIndex = (luuNienBranchIndex + 2) % 12;
  saoLuuMap[luuTangMonIndex].push("Lưu Tang Môn");

  // Lưu Bạch Hổ = (Lưu Thái Tuế + 8) % 12 (đối cung với Lưu Tang Môn)
  const luuBachHoIndex = (luuNienBranchIndex + 8) % 12;
  saoLuuMap[luuBachHoIndex].push("Lưu Bạch Hổ");

  // C. Lưu Lộc Tồn, Lưu Kình Dương, Lưu Đà La:
  // Determine Heavenly Stem of transitYear (Y % 10)
  // 0: Canh, 1: Tân, 2: Nhâm, 3: Quý, 4: Giáp, 5: Ất, 6: Bính, 7: Đinh, 8: Mậu, 9: Kỷ
  const transitStemIndex = transitYear % 10;
  let luuLocTonIndex = 2; // default Giáp in Dần (2)
  if (transitStemIndex === 0) luuLocTonIndex = 8; // Canh -> Thân(8)
  else if (transitStemIndex === 1) luuLocTonIndex = 9; // Tân -> Dậu(9)
  else if (transitStemIndex === 2) luuLocTonIndex = 11; // Nhâm -> Hợi(11)
  else if (transitStemIndex === 3) luuLocTonIndex = 0; // Quý -> Tý(0)
  else if (transitStemIndex === 4) luuLocTonIndex = 2; // Giáp -> Dần(2)
  else if (transitStemIndex === 5) luuLocTonIndex = 3; // Ất -> Mão(3)
  else if (transitStemIndex === 6) luuLocTonIndex = 5; // Bính -> Tỵ(5)
  else if (transitStemIndex === 7) luuLocTonIndex = 6; // Đinh -> Ngọ(6)
  else if (transitStemIndex === 8) luuLocTonIndex = 5; // Mậu -> Tỵ(5)
  else if (transitStemIndex === 9) luuLocTonIndex = 6; // Kỷ -> Ngọ(6)

  saoLuuMap[luuLocTonIndex].push("Lưu Lộc Tồn");

  const luuKinhDuongIndex = (luuLocTonIndex + 1) % 12;
  saoLuuMap[luuKinhDuongIndex].push("Lưu Kình Dương");

  const luuDaLaIndex = (luuLocTonIndex - 1 + 12) % 12;
  saoLuuMap[luuDaLaIndex].push("Lưu Đà La");

  // D. Lưu Thiên Mã:
  // Dần - Ngọ - Tuất (indices 2, 6, 10) -> Thân (8)
  // Thân - Tý - Thìn (indices 8, 0, 4) -> Dần (2)
  // Tỵ - Dậu - Sửu (indices 5, 9, 1) -> Hợi (11)
  // Hợi - Mão - Mùi (indices 11, 3, 7) -> Tỵ (5)
  let luuThienMaIndex = 8;
  if ([2, 6, 10].includes(luuNienBranchIndex)) {
    luuThienMaIndex = 8;
  } else if ([8, 0, 4].includes(luuNienBranchIndex)) {
    luuThienMaIndex = 2;
  } else if ([5, 9, 1].includes(luuNienBranchIndex)) {
    luuThienMaIndex = 11;
  } else if ([11, 3, 7].includes(luuNienBranchIndex)) {
    luuThienMaIndex = 5;
  }
  saoLuuMap[luuThienMaIndex].push("Lưu Thiên Mã");

  // E. Lưu Thiên Khốc & Lưu Thiên Hư:
  // Derived from the Index of Year Branch T where (T = luuNienBranchIndex)
  // Khốc index = (6 - T + 12) % 12
  // Hư index = (6 + T) % 12
  const luuKhocIndex = (6 - luuNienBranchIndex + 12) % 12;
  const luuHuIndex = (6 + luuNienBranchIndex) % 12;
  saoLuuMap[luuKhocIndex].push("Lưu Thiên Khốc");
  saoLuuMap[luuHuIndex].push("Lưu Thiên Hư");

  return {
    transitYear,
    lunarAge,
    daiHanPalaceIndex,
    daiHanPalaceName,
    tieuHanPalaceIndex,
    tieuHanPalaceName,
    luuNienThaiTueIndex,
    luuNienThaiTueName,
    saoLuuMap,
  };
}


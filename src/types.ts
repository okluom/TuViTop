export type BirthplaceRegion = 
  | "Miền Nam VN" 
  | "Miền Trung VN (Vĩ tuyến 17 trở vào: Huế, Đà Nẵng, Khánh Hòa...)"
  | "Miền Trung VN (Vĩ tuyến 17 trở ra: Thanh Hóa, Nghệ An, Hà Tĩnh, Quảng Bình)"
  | "Miền Bắc VN / Khác" 
  | "Nước ngoài (Quy đổi GMT+7)";

export interface BirthInput {
  name: string;
  solarDate: string; // YYYY-MM-DD
  solarTime: string; // HH:MM
  birthplace: BirthplaceRegion;
  gender: "Nam" | "Nữ";
  customApiKey: string;
  modelSelection: "gemini-3.5-flash" | "gemini-3.1-flash-lite";
  originalTimezoneOffset?: number; // for overseas births
}

export interface SavedProfile extends Omit<BirthInput, "customApiKey"> {
  id: string;
  createdAt: string;
}

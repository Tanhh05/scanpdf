export type Profile = {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: "USER" | "ADMIN";
    status?: string;
    emailVerifiedAt?: string | null;
    createdAt?: string;
    hasPassword?: boolean;
    twoFactorEnabled?: boolean;
  };
  plan: { name: string; dailyLimit: number; maxFileSizeMb?: number; storageDays?: number };
  usedToday: number;
  remainingToday: number;
};

export type Conversion = {
  id: string;
  tool: string;
  status: string;
  createdAt: string;
  errorMessage?: string | null;
  downloadUrl?: string | null;
  inputFile: { originalName: string; fileSize?: number; expiredAt?: string };
  outputFile?: { originalName: string; fileSize?: number; expiredAt?: string } | null;
  canDownload?: boolean;
};

export type ConversionList = {
  items: Conversion[];
  total: number;
  page: number;
  pages: number;
  limit: number;
};

export type Payment = {
  id: string;
  transactionCode: string;
  amount: number;
  status: string;
  createdAt: string;
  plan: { name: string };
};

export type PaginatedList<T> = {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
};

export const toolNames: Record<string, string> = {
  WORD_TO_PDF: "Word sang PDF",
  PDF_TO_WORD: "PDF sang Word",
  MERGE_PDF: "Ghép PDF",
  COMPRESS_PDF: "Nén PDF",
  JPG_TO_PDF: "JPG sang PDF",
  PDF_TO_JPG: "PDF sang JPG",
  OCR_PDF: "PDF OCR",
  SPLIT_PDF: "Tách PDF",
  ROTATE_PDF: "Xoay PDF",
  DELETE_PDF_PAGES: "Xóa trang PDF",
  WATERMARK_PDF: "Watermark PDF",
  REORDER_PDF: "Sắp xếp trang PDF",
  ADD_PAGE_NUMBERS: "Đánh số trang PDF",
  PROTECT_PDF: "Khóa PDF",
  UNLOCK_PDF: "Mở khóa PDF",
  SIGN_PDF: "Ký PDF",
};

export function getInitials(fullName?: string, email?: string) {
  const words = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 1) return words[0]!.slice(0, 2).toLocaleUpperCase("vi");
  if (words.length > 1) return `${words[0]![0]}${words.at(-1)![0]}`.toLocaleUpperCase("vi");
  return email?.slice(0, 2).toLocaleUpperCase("vi") ?? "TK";
}

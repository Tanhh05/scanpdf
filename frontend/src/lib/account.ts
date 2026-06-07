export type Profile = {
  user: { fullName: string; email: string; createdAt?: string };
  plan: { name: string; dailyLimit: number; maxFileSizeMb?: number; storageDays?: number };
  usedToday: number;
  remainingToday: number;
};

export type Conversion = {
  id: string;
  tool: string;
  status: string;
  createdAt: string;
  inputFile: { originalName: string };
};

export type Payment = {
  id: string;
  transactionCode: string;
  amount: number;
  status: string;
  createdAt: string;
  plan: { name: string };
};

export const toolNames: Record<string, string> = {
  WORD_TO_PDF: "Word sang PDF",
  PDF_TO_WORD: "PDF sang Word",
  MERGE_PDF: "Ghép PDF",
  COMPRESS_PDF: "Nén PDF",
  JPG_TO_PDF: "JPG sang PDF",
  PDF_TO_JPG: "PDF sang JPG",
  OCR_PDF: "PDF OCR",
};

export function getInitials(fullName?: string, email?: string) {
  const words = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 1) return words[0]!.slice(0, 2).toLocaleUpperCase("vi");
  if (words.length > 1) return `${words[0]![0]}${words.at(-1)![0]}`.toLocaleUpperCase("vi");
  return email?.slice(0, 2).toLocaleUpperCase("vi") ?? "TK";
}

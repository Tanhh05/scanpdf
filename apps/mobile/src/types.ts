export type User = {
  id: string;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN";
};

export type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number;
};

export type Conversion = {
  id: string;
  tool: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  errorMessage?: string | null;
  createdAt: string;
  canDownload?: boolean;
  downloadUrl?: string | null;
  inputFile?: { originalName: string };
  outputFile?: { originalName: string };
};

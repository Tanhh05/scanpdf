import { PayOS } from "@payos/node";
import { env } from "./env.js";
import { HttpError } from "../utils/http-error.js";

export function getPayOS() {
  if (!env.PAYOS_CLIENT_ID || !env.PAYOS_API_KEY || !env.PAYOS_CHECKSUM_KEY) {
    throw new HttpError(503, "PayOS chưa được cấu hình");
  }

  return new PayOS({
    clientId: env.PAYOS_CLIENT_ID,
    apiKey: env.PAYOS_API_KEY,
    checksumKey: env.PAYOS_CHECKSUM_KEY,
  });
}

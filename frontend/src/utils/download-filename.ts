function normalizeFilename(filename: string) {
  return filename
    .normalize("NFC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function filenameFromContentDisposition(header: unknown) {
  if (typeof header !== "string") return null;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return normalizeFilename(decodeURIComponent(utf8Match[1]));
    } catch {
      return normalizeFilename(utf8Match[1]);
    }
  }

  const quotedMatch = /filename="([^"]+)"/i.exec(header);
  if (quotedMatch?.[1]) return normalizeFilename(quotedMatch[1]);

  const plainMatch = /filename=([^;]+)/i.exec(header);
  if (plainMatch?.[1]) return normalizeFilename(plainMatch[1]);

  return null;
}

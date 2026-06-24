function hasMojibakeMarkers(value: string) {
  return /Ã|Â|Ä|áº|Æ|Ð|ð|�/.test(value);
}

function decodePercentFilename(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value.replace(/%20/g, " ");
  }
}

function decodeLatin1Utf8(value: string) {
  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
}

function decodeWindows1252Utf8(value: string) {
  const cp1252Bytes = new Map<string, number>([
    ["€", 0x80],
    ["‚", 0x82],
    ["ƒ", 0x83],
    ["„", 0x84],
    ["…", 0x85],
    ["†", 0x86],
    ["‡", 0x87],
    ["ˆ", 0x88],
    ["‰", 0x89],
    ["Š", 0x8a],
    ["‹", 0x8b],
    ["Œ", 0x8c],
    ["Ž", 0x8e],
    ["‘", 0x91],
    ["’", 0x92],
    ["“", 0x93],
    ["”", 0x94],
    ["•", 0x95],
    ["–", 0x96],
    ["—", 0x97],
    ["˜", 0x98],
    ["™", 0x99],
    ["š", 0x9a],
    ["›", 0x9b],
    ["œ", 0x9c],
    ["ž", 0x9e],
    ["Ÿ", 0x9f],
  ]);

  try {
    const bytes = Array.from(value, (char) => cp1252Bytes.get(char) ?? char.charCodeAt(0));
    return Buffer.from(bytes).toString("utf8");
  } catch {
    return value;
  }
}

function scoreFilename(value: string) {
  let score = 0;
  if (value.includes("�")) score += 20;
  score += (value.match(/Ã|Â|Ä|áº|Æ|Ð|ð/g) ?? []).length * 4;
  score += (value.match(/[\u0000-\u001f]/g) ?? []).length * 3;
  return score;
}

function stripUnsafeFilenameChars(value: string) {
  return value
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function asciiFallbackFilename(value: string) {
  const fallback = value
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return fallback || "scanpdf-file";
}

export function normalizeUploadedFilename(filename: string) {
  const percentDecoded = decodePercentFilename(filename);
  const decoded = hasMojibakeMarkers(percentDecoded)
    ? [percentDecoded, decodeLatin1Utf8(percentDecoded), decodeWindows1252Utf8(percentDecoded)]
      .sort((left, right) => scoreFilename(left) - scoreFilename(right))[0]!
    : percentDecoded;
  const normalized = stripUnsafeFilenameChars(decoded.normalize("NFC"));

  return normalized || "scanpdf-file";
}

export function contentDispositionAttachment(filename: string) {
  const normalized = normalizeUploadedFilename(filename);
  const fallback = asciiFallbackFilename(normalized).replace(/"/g, "'");

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(normalized)}`;
}

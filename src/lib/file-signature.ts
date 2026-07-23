import "server-only";

// Every upload route in this app currently trusts the client-supplied
// `file.type` (a multipart Content-Type header, fully attacker-controlled)
// to decide what got uploaded. This checks the actual leading bytes against
// the format the client claims, closing the "upload arbitrary content,
// declare it as image/png" gap — especially important for the two public
// buckets (lesson-images, book-audio), which serve whatever was uploaded
// back out under that same declared content type.

function bytesStartWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

function bytesStartWithAscii(bytes: Uint8Array, text: string, offset = 0): boolean {
  return bytesStartWith(
    bytes,
    Array.from(text).map((c) => c.charCodeAt(0)),
    offset
  );
}

function looksLikeMarkup(bytes: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 512)).toLowerCase();
  return /<script|<html|<!doctype|<iframe/.test(head);
}

// Maps each MIME type this app accepts anywhere to a check against the
// actual bytes. A type with no entry (e.g. text/plain, which has no fixed
// signature) falls through to a lighter markup-sniff heuristic instead —
// see matchesDeclaredMimeType below.
const SIGNATURE_CHECKS: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/png": (b) => bytesStartWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/jpeg": (b) => bytesStartWith(b, [0xff, 0xd8, 0xff]),
  "image/webp": (b) => bytesStartWithAscii(b, "RIFF") && bytesStartWithAscii(b, "WEBP", 8),
  "image/gif": (b) => bytesStartWithAscii(b, "GIF87a") || bytesStartWithAscii(b, "GIF89a"),
  "application/pdf": (b) => bytesStartWithAscii(b, "%PDF-"),
  "audio/mpeg": (b) => bytesStartWithAscii(b, "ID3") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
  "audio/mp3": (b) => bytesStartWithAscii(b, "ID3") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
  "audio/wav": (b) => bytesStartWithAscii(b, "RIFF") && bytesStartWithAscii(b, "WAVE", 8),
  "audio/ogg": (b) => bytesStartWithAscii(b, "OggS"),
  "audio/m4a": (b) => bytesStartWithAscii(b, "ftyp", 4),
  "audio/mp4": (b) => bytesStartWithAscii(b, "ftyp", 4),
  "video/mp4": (b) => bytesStartWithAscii(b, "ftyp", 4),
  "video/webm": (b) => bytesStartWith(b, [0x1a, 0x45, 0xdf, 0xa3]),
  "video/ogg": (b) => bytesStartWithAscii(b, "OggS"),
  "application/msword": (b) => bytesStartWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (b) => bytesStartWithAscii(b, "PK"),
  "application/zip": (b) => bytesStartWithAscii(b, "PK"),
};

export function matchesDeclaredMimeType(bytes: Uint8Array, mimeType: string): boolean {
  const check = SIGNATURE_CHECKS[mimeType];
  if (check) return check(bytes);
  if (mimeType === "text/plain") return !looksLikeMarkup(bytes);
  // No signature known for this type — nothing to compare against.
  return true;
}

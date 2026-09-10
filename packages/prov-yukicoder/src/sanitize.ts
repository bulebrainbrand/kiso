export function sanitizeSegment(raw: string, fallback: string): string {
  const replaced = raw.trim().replace(/[/\\]/g, "_");
  let sanitized = "";
  for (let i = 0; i < replaced.length; i++) {
    const code = replaced.charCodeAt(i);
    sanitized += code <= 0x1f || code === 0x7f ? "_" : replaced[i];
  }
  if (sanitized === "" || sanitized === "." || sanitized === "..") {
    return fallback;
  }
  return sanitized;
}

export function sanitizeTestCaseName(raw: string, index: number): string {
  return sanitizeSegment(raw, `kiso_placeholder_${index}`);
}

function parseClientCode(code: string | null | undefined) {
  if (!code) return 0;
  const match = code.match(/^CLI-(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

export function getNextClientCode(codes: Array<string | null | undefined>) {
  const nextNumber = codes.reduce((max, code) => Math.max(max, parseClientCode(code)), 0) + 1;
  return `CLI-${String(nextNumber).padStart(4, '0')}`;
}

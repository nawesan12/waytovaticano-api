export type Page<T> = { items: T[]; meta: { nextCursor: string | null } };
export function encodeCursor(obj: any) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
export function decodeCursor<T = any>(c?: string | null): T | null {
  if (!c) return null;
  return JSON.parse(Buffer.from(c, "base64url").toString());
}

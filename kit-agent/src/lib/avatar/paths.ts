import path from "path";

const ALLOWED_PREFIXES = ["/avatar-cache/", "/media-output/", "/avatar-output/"];

export function isAllowedPublicAsset(url: string): boolean {
  if (!url.startsWith("/")) return false;
  return ALLOWED_PREFIXES.some((p) => url.startsWith(p));
}

export function publicUrlToAbsolute(publicUrl: string): string {
  const clean = publicUrl.startsWith("/") ? publicUrl.slice(1) : publicUrl;
  return path.join(process.cwd(), "public", clean);
}

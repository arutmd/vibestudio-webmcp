import type { CreatorPlatform, CreatorRecord } from "./types";

export type SourceIntakeMode = "link" | "text" | "mixed";
export type SourceIntakeDraft = Pick<
  CreatorRecord,
  "platform" | "handle" | "display_name" | "profile_url" | "note"
> & {
  mode: SourceIntakeMode;
};

const platforms: CreatorPlatform[] = ["instagram", "facebook", "tiktok", "youtube", "news", "web"];
const knownHost = /(?:www\.)?(?:youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch)\/[^^\s<>{}\[\]"']*/i;
const explicitUrl = /https?:\/\/[^\s<>{}\[\]"']+/i;

function cleanUrlTail(value: string): string {
  return value.replace(/[),.;!?]+$/, "");
}

export function extractSourceUrl(input: string): string | null {
  const direct = input.match(explicitUrl)?.[0];
  if (direct) return cleanUrlTail(direct);
  const known = input.match(knownHost)?.[0];
  return known ? `https://${cleanUrlTail(known)}` : null;
}

function platformFromText(input: string, url: string | null): CreatorPlatform {
  const haystack = `${url ?? ""} ${input}`.toLocaleLowerCase();
  if (/youtu\.be|youtube/.test(haystack)) return "youtube";
  if (/tiktok/.test(haystack)) return "tiktok";
  if (/instagram|\binsta\b/.test(haystack)) return "instagram";
  if (/facebook|fb\.watch/.test(haystack)) return "facebook";
  if (/\b(news|newsletter|publication|newspaper|journal)\b/.test(haystack)) return "news";
  return "web";
}

function safeHandle(value: string): string {
  const cleaned = value
    .replace(/^@+/, "")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return cleaned || `source-${Date.now()}`;
}

function nameFromUrl(url: string): string {
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const candidate = segments.find((segment) => segment.startsWith("@"))
    ?? segments.at(-1)
    ?? parsed.hostname.replace(/^www\./, "").split(".")[0];
  return candidate
    .replace(/^@/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase())
    .slice(0, 120);
}

function nameFromText(input: string): string {
  const withoutCommand = input
    .replace(/^(?:please\s+)?(?:follow|add|track|watch|save)\s+/i, "")
    .split(/\s+(?:on|because|for|so that|to learn|to study)\s+/i)[0]
    .trim();
  return (withoutCommand || "New source").slice(0, 120);
}

export function parseSourceIntake(input: string): SourceIntakeDraft {
  const raw = input.trim().slice(0, 1200);
  const url = extractSourceUrl(raw);
  const text = url ? raw.replace(url, "").trim() : raw;
  const reason = text.match(/\b(?:because|for|so that|to learn|to study)\s+(.+)$/i)?.[1]?.trim() ?? text;
  const mode: SourceIntakeMode = url ? (text ? "mixed" : "link") : "text";
  const displayName = url ? nameFromUrl(url) : nameFromText(raw);
  return {
    mode,
    platform: platformFromText(raw, url),
    handle: safeHandle(displayName),
    display_name: displayName,
    profile_url: url,
    note: reason.slice(0, 500),
  };
}

export function coerceSourceIntake(value: unknown, input: string): SourceIntakeDraft {
  const fallback = parseSourceIntake(input);
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const platform = platforms.includes(record.platform as CreatorPlatform)
    ? record.platform as CreatorPlatform
    : fallback.platform;
  const displayName = typeof record.display_name === "string" && record.display_name.trim()
    ? record.display_name.trim().slice(0, 120)
    : fallback.display_name;
  return {
    ...fallback,
    platform,
    display_name: displayName,
    handle: safeHandle(typeof record.handle === "string" ? record.handle : displayName),
    note: typeof record.note === "string" ? record.note.trim().slice(0, 500) : fallback.note,
  };
}

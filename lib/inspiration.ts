import type { CreatorPlatform, CreatorRecord, InspirationRecord } from "./types";
import {
  ValidationError,
  asEnum,
  asHttpUrl,
  asObject,
  asOptionalEnum,
  asOptionalText,
  asText,
  asVersion,
} from "./validation";

export const CREATOR_PLATFORMS = ["instagram", "facebook", "tiktok", "youtube", "news", "web"] as const;
export const CREATOR_STATUSES = ["active", "paused", "archived"] as const;
export const INSPIRATION_STATUSES = ["feed", "saved", "archived"] as const;
export const INSPIRATION_REACTIONS = ["like", "dislike", "none"] as const;
export const MEDIA_KINDS = ["image", "video_still", "carousel", "text", "unavailable"] as const;

export type CreatorCreate = Omit<CreatorRecord, "id" | "created_at" | "updated_at" | "version">;
export type InspirationCreate = Omit<InspirationRecord, "id" | "created_at" | "updated_at" | "version">;

function cleanHandle(value: unknown): string {
  const handle = asText(value, "handle", 100).replace(/^@+/, "");
  if (!/^[A-Za-z0-9._-]+$/.test(handle)) {
    throw new ValidationError("handle may contain only letters, numbers, dots, underscores, and hyphens");
  }
  return handle;
}

export function parseCreatorCreate(value: unknown): CreatorCreate {
  const input = asObject(value);
  return {
    platform: asEnum(input.platform, "platform", CREATOR_PLATFORMS),
    handle: cleanHandle(input.handle),
    display_name: asText(input.display_name ?? input.handle, "display_name", 120),
    profile_url: input.profile_url === null || input.profile_url === undefined || input.profile_url === ""
      ? null
      : asHttpUrl(input.profile_url, "profile_url"),
    status: input.status === undefined ? "active" : asEnum(input.status, "status", CREATOR_STATUSES),
    note: asText(input.note ?? "", "note", 500, { required: false, allowEmpty: true }),
  };
}

export function parseCreatorPatch(value: unknown): {
  patch: Partial<Pick<CreatorRecord, "display_name" | "profile_url" | "status" | "note">>;
  expectedVersion?: number;
} {
  const input = asObject(value);
  const patch: Partial<Pick<CreatorRecord, "display_name" | "profile_url" | "status" | "note">> = {};
  const displayName = asOptionalText(input.display_name, "display_name", 120);
  const note = asOptionalText(input.note, "note", 500);
  const status = asOptionalEnum(input.status, "status", CREATOR_STATUSES);
  if (displayName !== undefined) patch.display_name = displayName;
  if (note !== undefined) patch.note = note;
  if (status !== undefined) patch.status = status;
  if (input.profile_url !== undefined) patch.profile_url = asHttpUrl(input.profile_url, "profile_url");
  if (!Object.keys(patch).length) throw new ValidationError("no supported creator fields provided");
  return { patch, expectedVersion: asVersion(input.expected_version) };
}

function cleanMediaPath(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const mediaPath = asText(value, "media_path", 500);
  if (!mediaPath.startsWith("/inspiration/") || mediaPath.includes("..")) {
    throw new ValidationError("media_path must be a safe /inspiration/ asset path");
  }
  return mediaPath;
}

export function parseInspirationCreate(value: unknown): InspirationCreate {
  const input = asObject(value);
  return {
    creator_id:
      input.creator_id === null || input.creator_id === undefined
        ? null
        : asText(input.creator_id, "creator_id", 80),
    platform: asEnum(input.platform, "platform", CREATOR_PLATFORMS),
    source_url: asHttpUrl(input.source_url, "source_url"),
    media_kind: asEnum(input.media_kind ?? "unavailable", "media_kind", MEDIA_KINDS),
    media_path: cleanMediaPath(input.media_path),
    title: asText(input.title, "title", 180),
    caption: asText(input.caption ?? "", "caption", 1500, { required: false, allowEmpty: true }),
    transcript: asText(input.transcript ?? "", "transcript", 5000, { required: false, allowEmpty: true }),
    saved_reason: asText(input.saved_reason ?? "", "saved_reason", 700, { required: false, allowEmpty: true }),
    status: input.status === undefined ? "saved" : asEnum(input.status, "status", INSPIRATION_STATUSES),
    reaction: input.reaction === undefined ? "none" : asEnum(input.reaction, "reaction", INSPIRATION_REACTIONS),
    reaction_note: asText(input.reaction_note ?? "", "reaction_note", 600, { required: false, allowEmpty: true }),
  };
}

export function parseInspirationPatch(value: unknown): {
  patch: Partial<Pick<InspirationRecord, "reaction" | "reaction_note" | "status" | "saved_reason">>;
  expectedVersion?: number;
} {
  const input = asObject(value);
  const patch: Partial<Pick<InspirationRecord, "reaction" | "reaction_note" | "status" | "saved_reason">> = {};
  const reaction = asOptionalEnum(input.reaction, "reaction", INSPIRATION_REACTIONS);
  const status = asOptionalEnum(input.status, "status", INSPIRATION_STATUSES);
  const reactionNote = asOptionalText(input.reaction_note, "reaction_note", 600);
  const savedReason = asOptionalText(input.saved_reason, "saved_reason", 700);
  if (reaction !== undefined) patch.reaction = reaction;
  if (status !== undefined) patch.status = status;
  if (reactionNote !== undefined) patch.reaction_note = reactionNote;
  if (savedReason !== undefined) patch.saved_reason = savedReason;
  if (!Object.keys(patch).length) throw new ValidationError("no supported inspiration fields provided");
  return { patch, expectedVersion: asVersion(input.expected_version) };
}

export function platformLabel(platform: CreatorPlatform): string {
  return platform === "tiktok" ? "TikTok" : platform.charAt(0).toUpperCase() + platform.slice(1);
}

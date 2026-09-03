import { FILES } from "./paths";
import { mutateAll, nextId, nowIso } from "./jsonl";
import type { BrainCategory, BrainRecord, InspirationRecord } from "./types";
import {
  ValidationError,
  asEnum,
  asObject,
  asOptionalEnum,
  asOptionalStringList,
  asOptionalText,
  asStringList,
  asText,
  asVersion,
} from "./validation";

export const BRAIN_CATEGORIES = [
  "identity",
  "audience",
  "voice",
  "visual_taste",
  "content_goal",
  "production_rule",
  "example",
  "learning",
] as const satisfies readonly BrainCategory[];
export const BRAIN_STATUSES = ["active", "proposed", "archived"] as const;
export const BRAIN_AUTHORS = ["palm", "arutlee"] as const;
export const BRAIN_SOURCE_TYPES = [
  "brand_doc",
  "direct_edit",
  "inspiration_reaction",
  "accepted_revision",
  "published_example",
] as const;

export type BrainCreate = Omit<BrainRecord, "id" | "created_at" | "updated_at" | "version">;

export function parseBrainCreate(value: unknown): BrainCreate {
  const input = asObject(value);
  return {
    category: asEnum(input.category, "category", BRAIN_CATEGORIES),
    text: asText(input.text, "text", 700),
    tags: input.tags === undefined ? [] : asStringList(input.tags, "tags", 12, 60),
    status: input.status === undefined ? "active" : asEnum(input.status, "status", BRAIN_STATUSES),
    authored_by: input.authored_by === undefined ? "palm" : asEnum(input.authored_by, "authored_by", BRAIN_AUTHORS),
    source_type:
      input.source_type === undefined
        ? "direct_edit"
        : asEnum(input.source_type, "source_type", BRAIN_SOURCE_TYPES),
    source_id:
      input.source_id === undefined || input.source_id === null
        ? null
        : asText(input.source_id, "source_id", 100),
    supersedes_id:
      input.supersedes_id === undefined || input.supersedes_id === null
        ? null
        : asText(input.supersedes_id, "supersedes_id", 100),
  };
}

export function parseBrainPatch(value: unknown): {
  patch: Partial<Pick<BrainRecord, "category" | "text" | "tags" | "status">>;
  expectedVersion?: number;
} {
  const input = asObject(value);
  const patch: Partial<Pick<BrainRecord, "category" | "text" | "tags" | "status">> = {};
  const category = asOptionalEnum(input.category, "category", BRAIN_CATEGORIES);
  const text = asOptionalText(input.text, "text", 700);
  const tags = asOptionalStringList(input.tags, "tags", 12, 60);
  const status = asOptionalEnum(input.status, "status", BRAIN_STATUSES);
  if (category !== undefined) patch.category = category;
  if (text !== undefined) {
    if (!text) throw new ValidationError("text cannot be empty");
    patch.text = text;
  }
  if (tags !== undefined) patch.tags = tags;
  if (status !== undefined) patch.status = status;
  if (!Object.keys(patch).length) throw new ValidationError("no supported Brain fields provided");
  return { patch, expectedVersion: asVersion(input.expected_version) };
}

export function reactionBrainText(inspiration: InspirationRecord): string {
  const reason = inspiration.reaction_note || inspiration.saved_reason || "No note added yet.";
  const lead = inspiration.reaction === "like" ? "Likes" : "Avoids";
  return `${lead}: ${inspiration.title}. Reason: ${reason}`.slice(0, 700);
}

export async function upsertInspirationReactionBrain(
  inspiration: InspirationRecord,
): Promise<{ before: BrainRecord | null; after: BrainRecord | null }> {
  return mutateAll<BrainRecord, { before: BrainRecord | null; after: BrainRecord | null }>(
    FILES.brain,
    (records) => {
      const position = records.findIndex(
        (record) =>
          record.source_type === "inspiration_reaction" && record.source_id === inspiration.id,
      );
      const before = position >= 0 ? records[position] : null;
      const now = nowIso();
      if (inspiration.reaction === "none") {
        if (!before || before.status === "archived") {
          return { records, result: { before, after: before }, changed: false };
        }
        const after: BrainRecord = {
          ...before,
          status: "archived",
          updated_at: now,
          version: before.version + 1,
        };
        const next = records.slice();
        next[position] = after;
        return { records: next, result: { before, after } };
      }

      const common = {
        category: "visual_taste" as const,
        text: reactionBrainText(inspiration),
        tags: ["taste-evidence", inspiration.platform, inspiration.reaction, "carousel-v1"],
        status: "active" as const,
        authored_by: "palm" as const,
        source_type: "inspiration_reaction" as const,
        source_id: inspiration.id,
      };
      if (before) {
        const after: BrainRecord = {
          ...before,
          ...common,
          updated_at: now,
          version: before.version + 1,
        };
        const next = records.slice();
        next[position] = after;
        return { records: next, result: { before, after } };
      }
      const after: BrainRecord = {
        id: nextId(records, "brain"),
        created_at: now,
        updated_at: now,
        version: 1,
        ...common,
      };
      return { records: [...records, after], result: { before: null, after } };
    },
  );
}

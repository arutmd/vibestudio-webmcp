import type { CarouselSlide, ContextReceipt, PieceRecord } from "./types";
import { validateChallengeCarousel } from "./skills/carouselSkill";
import {
  ValidationError,
  asIdempotencyKey,
  asObject,
  asOptionalEnum,
  asText,
  asVersion,
} from "./validation";

export type ChallengePieceCreate = {
  inspirationId: string;
  receiptId: string;
  title: string;
  hook: string;
  body: string;
  transformationNote: string;
  slides: CarouselSlide[];
  idempotencyKey: string | null;
};

export function isChallengePieceRequest(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.skill_id !== undefined ||
    record.context_receipt_id !== undefined ||
    record.inspiration_id !== undefined
  );
}

export function parseChallengePieceCreate(value: unknown): ChallengePieceCreate {
  const input = asObject(value);
  if (input.skill_id !== "carousel-v1") {
    throw new ValidationError("skill_id must be carousel-v1");
  }
  if (input.skill_version !== "1.0.0") {
    throw new ValidationError("skill_version must be 1.0.0");
  }
  if (input.status !== undefined && input.status !== "draft") {
    throw new ValidationError("a WebMCP carousel must start as draft");
  }
  const title = asText(input.title, "title", 300);
  const hook = asText(input.hook ?? input.body ?? "", "hook", 600, {
    required: false,
    allowEmpty: true,
  });
  const body = asText(input.body ?? "", "body", 4_000, {
    required: false,
    allowEmpty: true,
  });
  const transformationNote = asText(
    input.transformation_note,
    "transformation_note",
    700,
  );
  if (transformationNote.length < 20) {
    throw new ValidationError("transformation_note must explain the original transformation");
  }
  return {
    inspirationId: asText(input.inspiration_id, "inspiration_id", 80),
    receiptId: asText(input.context_receipt_id, "context_receipt_id", 80),
    title,
    hook,
    body,
    transformationNote,
    slides: validateChallengeCarousel(input.carousel, { deckTitle: title, deckHook: hook }),
    idempotencyKey: asIdempotencyKey(input.idempotency_key),
  };
}

export function assertReceiptMatchesCreate(
  receipt: ContextReceipt | null,
  input: ChallengePieceCreate,
): asserts receipt is ContextReceipt {
  if (!receipt) throw new ValidationError("context receipt not found", 404);
  if (
    receipt.purpose !== "carousel_create" ||
    receipt.inspiration_id !== input.inspirationId ||
    receipt.skill_id !== "carousel-v1" ||
    receipt.skill_version !== "1.0.0"
  ) {
    throw new ValidationError("context receipt does not match this carousel request", 409);
  }
}

export function parseSlideUpdate(value: unknown): {
  index: number;
  actor: "palm" | "codex";
  expectedVersion?: number;
  reason: string;
  patch: Partial<Pick<CarouselSlide, "title" | "body" | "visual_cue">>;
  idempotencyKey: string | null;
} {
  const input = asObject(value);
  const index = Number(input.slide_index);
  if (!Number.isInteger(index) || index < 1 || index > 7) {
    throw new ValidationError("slide_index must be an integer from 1 to 7");
  }
  const patch: Partial<Pick<CarouselSlide, "title" | "body" | "visual_cue">> = {};
  if (input.title !== undefined) patch.title = asText(input.title, "title", 180);
  if (input.body !== undefined) {
    patch.body = asText(input.body, "body", 700, { required: false, allowEmpty: true });
  }
  if (input.visual_cue !== undefined) {
    patch.visual_cue = asText(input.visual_cue, "visual_cue", 500, {
      required: false,
      allowEmpty: true,
    });
  }
  if (!Object.keys(patch).length) {
    throw new ValidationError("provide title, body, or visual_cue for the named slide");
  }
  return {
    index,
    actor: asOptionalEnum(input.actor, "actor", ["palm", "codex"] as const) ?? "codex",
    patch,
    reason: asText(input.reason ?? "Requested revision", "reason", 300),
    expectedVersion: asVersion(input.expected_version),
    idempotencyKey: asIdempotencyKey(input.idempotency_key),
  };
}

export function pieceVersion(piece: PieceRecord): number {
  return piece.current_version ?? 1;
}

export function humanPieceStatus(piece: PieceRecord): "draft" | "ready" | "scheduled" | "live" {
  if (piece.status === "published") return "live";
  if (piece.status === "scheduled") return "scheduled";
  if (piece.status === "qa_passed") return "ready";
  return "draft";
}

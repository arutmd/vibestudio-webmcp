import type {
  CaptureImageCandidate,
  PlatformId,
  PlatformRecommendation,
} from "./types";

const ALL_PLATFORMS: PlatformId[] = [
  "linkedin",
  "facebook",
  "instagram",
  "threads",
  "tiktok",
  "youtube",
];

const LAUNCH_PLATFORMS = new Set<PlatformId>([
  "linkedin",
  "facebook",
  "instagram",
]);

const DEFERRED_PLATFORMS = new Set<PlatformId>([
  "threads",
  "tiktok",
  "youtube",
]);

function hasAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function fit(score: number): PlatformRecommendation["fit"] {
  if (score >= 5) return "S";
  if (score >= 3) return "A";
  if (score >= 1) return "B";
  return "X";
}

function productionFit(
  platform: PlatformId,
  score: number,
): PlatformRecommendation["fit"] {
  const raw = fit(score);
  if (!DEFERRED_PLATFORMS.has(platform)) return raw;
  if (platform === "threads") {
    if (score >= 3) return "A";
    if (score >= 1) return "B";
    return "X";
  }
  if (score >= 5) return "B";
  if (score >= 3) return "B";
  return "X";
}

export function recommendPlatforms(input: {
  title?: string;
  summary?: string;
  sourceText?: string;
  sourceKind?: string;
  imageCandidates?: CaptureImageCandidate[];
}): PlatformRecommendation[] {
  const text = `${input.title ?? ""}\n${input.summary ?? ""}\n${input.sourceText ?? ""}`;
  const sourceChars = input.sourceText?.length ?? 0;
  const imageCount = input.imageCandidates?.length ?? 0;
  const isTranscript = input.sourceKind === "transcript";
  const isTechnical = hasAny(text, [
    "api",
    "model",
    "gpt",
    "agent",
    "dashboard",
    "analytics",
    "tool",
    "developer",
    "startup",
    "workflow",
    "reasoning",
  ]);
  const hasDemo = hasAny(text, ["demo", "build", "walkthrough", "example", "case study"]);
  const hasVoice = hasAny(text, ["voice", "audio", "realtime", "real-time", "call"]);
  const hasThaiFriendlyExplainer = isTechnical || hasDemo || sourceChars > 2500;

  const base: Record<PlatformId, number> = {
    linkedin: 1,
    facebook: 2,
    instagram: imageCount >= 3 ? 2 : 0,
    threads: 2,
    tiktok: isTranscript || hasVoice ? 2 : 0,
    youtube: isTranscript && sourceChars > 8000 ? 2 : 0,
  };

  if (isTechnical) {
    base.linkedin += 3;
    base.facebook += 2;
    base.threads += 1;
  }
  if (hasDemo) {
    base.facebook += 1;
    base.instagram += 1;
    base.tiktok += 1;
    base.youtube += 1;
  }
  if (hasVoice) {
    base.tiktok += 2;
    base.youtube += 1;
    base.linkedin += 1;
  }
  if (sourceChars > 20_000) {
    base.linkedin += 1;
    base.youtube += 1;
  }
  if (hasThaiFriendlyExplainer) {
    base.facebook += 1;
  }
  if (imageCount >= 5) {
    base.instagram += 2;
    base.facebook += 1;
  }

  const reasons: Record<PlatformId, string> = {
    linkedin: isTechnical
      ? "Launch tier. Strong for professional English packaging: product/API/workflow substance, practical implications, doctor-builder positioning."
      : "Launch tier. Usable if Palm adds a clearer professional implication and strong opening line.",
    facebook: hasThaiFriendlyExplainer
      ? "Launch tier. Strong for warm Thai explainer packaging: broader audience, more context, less jargon."
      : "Launch tier. Usable as a short Thai observation, but may need more context and an image-led hook.",
    instagram:
      imageCount >= 3
        ? "Launch tier. Good visual candidate because Fetch found enough references for carousel or Reel cover."
        : "Launch tier, but weak unless we create a stronger visual/carousel concept.",
    threads: "Deferred tier, but lightweight. Similar source effort to other text platforms: rapid take or short thread plus one typography card.",
    tiktok:
      isTranscript || hasVoice
        ? "Deferred tier. Content fit is good, but production needs a deliberate vertical-video pass, so keep it opt-in."
        : "Deferred tier. Weak unless Palm records a strong one-idea video angle.",
    youtube:
      isTranscript && sourceChars > 8000
        ? "Deferred tier. Source is rich enough, but YouTube needs thumbnail/video packaging, so keep it opt-in."
        : "Deferred tier. Probably not worth a YouTube-specific pass yet.",
  };

  const formats: Record<PlatformId, string[]> = {
    linkedin: [
      "English text post + hero image 1200x627",
      "carousel/PDF 1080x1350",
      "native video/Reels cover 1080x1920",
    ],
    facebook: [
      "Thai text post + hero image 1200x630",
      "carousel 1080x1080",
      "Facebook Reel cover/script 1080x1920",
    ],
    instagram: [
      "carousel 1080x1350",
      "Reel cover/script 1080x1920",
      "caption + photo",
    ],
    threads: [
      "rapid take / short thread",
      "typography card 1080x1080",
    ],
    tiktok: [
      "vertical short script 1080x1920",
      "large-caption talking-head cut",
    ],
    youtube: [
      "Shorts script 1080x1920",
      "thumbnail 1280x720",
      "description/outline",
    ],
  };

  return ALL_PLATFORMS.map((platform) => ({
    platform,
    fit: productionFit(platform, base[platform]),
    formats: formats[platform],
    reason: reasons[platform],
  }));
}

export function defaultSelectedPlatforms(
  recommendations?: PlatformRecommendation[],
): PlatformId[] {
  const recs = recommendations ?? [];
  const launchSelected = recs
    .filter((rec) => LAUNCH_PLATFORMS.has(rec.platform))
    .filter((rec) => rec.fit === "S" || rec.fit === "A")
    .map((rec) => rec.platform);
  if (launchSelected.length) return launchSelected;
  const deferredSelected = recs
    .filter((rec) => rec.fit === "S")
    .map((rec) => rec.platform);
  if (deferredSelected.length) return deferredSelected;
  return ["linkedin", "facebook"];
}

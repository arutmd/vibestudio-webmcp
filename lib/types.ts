// Shared types mirroring the JSONL schemas in ../data/README.md.
// Keep these in lockstep with that file; if either drifts, downstream AI agents
// reading the data layer will quietly produce wrong outputs.

export type InboxRecord = {
  id: string;
  captured_at: string;
  source:
    | "telegram"
    | "linkedin"
    | "facebook"
    | "instagram"
    | "youtube"
    | "tiktok"
    | "web"
    | "voice"
    | "manual";
  raw: string;
  url: string | null;
  media_path: string | null;
  initial_format: PieceFormat | "unknown";
  firewall_risk: "clear" | "near_miss" | "blocked" | "unknown";
  status: "new" | "triaged" | "drafted" | "skipped";
  notes?: string;
  ingredients?: CaptureIngredients;
  enriched_at?: string;
  enrichment_path?: string;
  image_paths?: string[];
  promoted_to_topic_id?: string;
  merged_into_topic_id?: string;
  promoted_to_creator_profile?: string;
};

export type CaptureIngredients = {
  source_title?: string;
  source_site?: string | null;
  source_text?: string;
  source_text_chars?: number;
  source_text_kind?: "transcript" | "article" | "summary" | "unknown";
  summary?: string;
  research_query?: string;
  image_query?: string;
  research_summary?: string;
  research_sources?: CaptureResearchSource[];
  image_candidates?: CaptureImageCandidate[];
  platform_recommendations?: PlatformRecommendation[];
  key_claims?: string[];
  hook_candidates?: string[];
};

export type PlatformFit = "S" | "A" | "B" | "X";

export type PlatformRecommendation = {
  platform: PlatformId;
  fit: PlatformFit;
  formats: string[];
  reason: string;
};

export type CaptureResearchSource = {
  url: string;
  title: string;
  description?: string;
  siteName?: string | null;
  imageUrl?: string | null;
  fetchedAt?: string;
};

export type CaptureImageCandidate = {
  url: string;
  thumbnailUrl?: string | null;
  title?: string;
  sourceUrl?: string;
  source?: string;
  width?: number;
  height?: number;
  localPath?: string;
};

export type PieceFormat =
  | "field_note"
  | "casefile"        // legacy rows; treated as casefile_opd
  | "casefile_opd"
  | "casefile_ipd"
  | "filter"
  | "anchor"
  | "threads_card"
  | "experiment";

export type PlatformId =
  | "linkedin"
  | "facebook"
  | "instagram"
  | "threads"
  | "tiktok"
  | "youtube";

export type CheckResult = "pass" | "fail" | "near_miss" | "not_run";

export type PieceRecord = {
  id: string;
  created_at: string;
  // Server-stamped on every PATCH. Older rows may not have it; readers must
  // fall back to created_at for resume-here ordering.
  updated_at?: string;
  status:
    | "idea"
    | "draft"
    | "qa_passed"
    | "scheduled"
    | "published"
    | "held"
    | "skipped";
  format: PieceFormat;
  title: string;
  hook: string;
  topic_ids: string[];
  source_inbox_ids: string[];
  lead_platform: PlatformId;
  platforms: PlatformId[];
  ip_kit: "day1" | "full" | "none";
  firewall_check: CheckResult;
  slop_check: CheckResult;
  voice_check: CheckResult;
  draft_path: string | null;
  published_urls: Partial<Record<PlatformId, string>>;
  notes: string;
  // Studio-only fields. The original schema keeps these on disk too; harmless
  // because JSONL append-only tolerates extra keys.
  body?: string;
  platform_variants?: Partial<Record<PlatformId, string>>;
  visual_prompt?: string;
  hero_image_path?: string;
  creative_reference_paths?: string[];
  cover_background_path?: string;
  cover_headline?: string;
  cover_subheadline?: string;
  cover_badge?: string;
  cover_template?: "tech_news" | "soft_gradient" | "interface_callout";
  cover_visual_mode?: "product_ui" | "workflow_diagram" | "phone_scene" | "human_tool" | "abstract_launch";
  visual_output?: "hero" | "carousel";
  scheduled_for?: string;
  engine_stage?:
    | "not_started"
    | "source"
    | "text"
    | "visual"
    | "render"
    | "qa"
    | "ready"
    | "approved"
    | "rejected"
    | "error";
  engine_slug?: string;
  engine_proposal_id?: string;
  engine_text_path?: string;
  engine_asset_path?: string;
  engine_base_layer_path?: string;
  engine_reference_layer_path?: string;
  engine_reference_layer_label?: string;
  engine_profile_layer_path?: string;
  engine_profile_layer_label?: string;
  engine_qa_path?: string;
  engine_review_path?: string;
  engine_last_run_at?: string;
  engine_error?: string;
  engine_text_decision?: "pending" | "approved" | "rejected";
  engine_image_decision?: "pending" | "approved" | "rejected";
  engine_provider?: "codex" | "claude" | "fallback";
  engine_image_provider?: "codex-image" | "html-fallback";
  agent_review?: PieceAgentReview;
  firewall_reasons?: string[];
  slop_reasons?: string[];
  voice_reasons?: string[];
  carousel?: CarouselSlide[];
  video_kit?: VideoKit;
  // Challenge lineage and agent-collaboration fields. Optional for full
  // backwards compatibility with every existing piece row.
  inspiration_id?: string;
  skill_id?: "carousel-v1";
  skill_version?: string;
  context_receipt_id?: string;
  transformation_note?: string;
  current_version?: number;
  // A VibeStudio Session is the durable collaboration boundary shared by the
  // human workspace and a browser agent. The connection id is a VibeStudio
  // receipt, not a claim that WebMCP exposes a native Codex thread id.
  session_output?: "carousel";
  session_brief?: string;
  session_origin?: "ui" | "webmcp" | "inspiration";
  session_connection_id?: string;
  session_connection_status?: "waiting" | "connected";
  session_agent_label?: string;
  session_connected_at?: string;
  last_render_dir?: string;
  operation?: {
    name: string;
    status: "working" | "needs_review" | "saved" | "error";
    progress?: { completed: number; total: number };
    message?: string;
    updated_at: string;
  };
};

export type PieceAgentSubagent = {
  name: string;
  task: string;
  reason: string;
};

export type PieceAgentReview = {
  summary: string;
  nextAction: string;
  blockers: string[];
  subagents: PieceAgentSubagent[];
  provider: "codex" | "fallback";
  updatedAt: string;
};

export type CarouselSlide = {
  index: number;
  kind: "cover" | "section" | "list" | "quote" | "outro";
  title: string;
  body: string;
  bullets?: string[];
  visual_cue: string;
  visual_prompt?: string;
  background_path?: string;
  asset_path?: string;
  image_provider?: "codex-image" | "none";
};

// --- Arutlee WebMCP challenge domains ------------------------------------
// These records are intentionally creator-neutral. Palm's editable Template
// is stored in brain rows for backward compatibility, while reusable production
// behavior lives in CreativeSkill.

export type CreatorPlatform =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "news"
  | "web";

export type CreatorRecord = {
  id: string;
  created_at: string;
  updated_at?: string;
  version: number;
  platform: CreatorPlatform;
  handle: string;
  display_name: string;
  profile_url: string | null;
  status: "active" | "paused" | "archived";
  note: string;
};

export type InspirationRecord = {
  id: string;
  created_at: string;
  updated_at?: string;
  version: number;
  creator_id: string | null;
  platform: CreatorPlatform;
  source_url: string | null;
  media_kind: "image" | "video_still" | "carousel" | "text" | "unavailable";
  media_path: string | null;
  title: string;
  caption: string;
  transcript: string;
  saved_reason: string;
  status: "feed" | "saved" | "archived";
  reaction: "like" | "dislike" | "none";
  reaction_note: string;
};

export type BrainCategory =
  | "identity"
  | "audience"
  | "voice"
  | "visual_taste"
  | "content_goal"
  | "production_rule"
  | "example"
  | "learning";

export type BrainRecord = {
  id: string;
  created_at: string;
  updated_at?: string;
  version: number;
  category: BrainCategory;
  text: string;
  tags: string[];
  status: "active" | "proposed" | "archived";
  authored_by: "palm" | "arutlee";
  source_type:
    | "brand_doc"
    | "direct_edit"
    | "inspiration_reaction"
    | "accepted_revision"
    | "published_example";
  source_id: string | null;
  supersedes_id?: string | null;
};

export type ContextPurpose = "carousel_create" | "carousel_revise" | "session_create";

export type ContextReceipt = {
  id: string;
  created_at: string;
  purpose: ContextPurpose;
  inspiration_id: string | null;
  piece_id: string | null;
  skill_id: "carousel-v1";
  skill_version: string;
  brain_ids: string[];
  example_piece_ids: string[];
  summary: string;
};

export type ActivityEntityType = "piece" | "slide" | "brain" | "inspiration" | "creator";

export type ActivityRecord = {
  id: string;
  created_at: string;
  actor: "palm" | "codex" | "system";
  entity_type: ActivityEntityType;
  entity_id: string;
  action: string;
  summary: string;
  before: unknown | null;
  after: unknown | null;
  idempotency_key: string | null;
  reversible: boolean;
  undone_at?: string | null;
};

export type CreativeSkill = {
  id: "carousel-v1";
  version: "1.0.0";
  title: string;
  purpose: string;
  input_contract: string[];
  output_contract: {
    slide_count: 7;
    dimensions: "1080x1350";
    fields: string[];
  };
  quality_rules: string[];
};

export type VideoVisualType =
  | "talking_head"
  | "definition_card"
  | "before_after"
  | "flow_diagram"
  | "tool_demo"
  | "rule_of_thumb";

export type VideoScene = {
  id: string;
  start_sec: number;
  end_sec: number;
  spoken_line: string;
  visual_type: VideoVisualType;
  visual_brief: string;
  production_note?: string;
};

export type VideoKit = {
  generated_at: string;
  target_duration_sec: number;
  hook: string;
  script: string;
  scenes: VideoScene[];
  talking_head_lines: string[];
  visual_card_ideas: string[];
  screen_recording_needs: string[];
  edit_checklist: string[];
  caption_style: string;
  files?: {
    script: string;
    scenes: string;
    shot_list: string;
    visual_briefs: string;
    edit_checklist: string;
  };
};

export type MetricsRecord = {
  piece_id: string;
  captured_at: string;
  window: "24h" | "7d" | "30d";
  platform: PlatformId;
  impressions?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  profile_visits?: number | null;
  follower_delta?: number | null;
  notes?: string;
};

export type DecisionRecord = {
  id: string;
  decided_at: string;
  scope:
    | "weekly_review"
    | "ip"
    | "platform"
    | "topic"
    | "workflow"
    | "experiment";
  decision: string;
  reason: string;
  next: string;
  owner: "Palm" | "OC" | "Claude Code" | "Studio";
};

export type ExperimentRecord = {
  id: string;
  created_at: string;
  hypothesis: string;
  format: PieceFormat;
  success_metric: string;
  status: "planned" | "running" | "won" | "lost" | "inconclusive";
  result: string;
  promote_to_standard: boolean;
};

// Topic seed (parsed from 03-content-pillars-and-series.md). Loaded lazily by
// the topic API; keeping the type here so consumers don't import from app/api.
export type Topic = {
  id: string; // e.g. "topic-1"
  number: number;
  title: string;
  formatTags: string[]; // ["A", "S", "T", ...]
  pillar?: string;
  notes?: string;
};

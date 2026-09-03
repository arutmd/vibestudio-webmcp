"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowBendDownRight,
  BookmarkSimple,
  CalendarBlank,
  Check,
  CheckCircle,
  ClockCounterClockwise,
  DotsThree,
  Export,
  FacebookLogo,
  GearSix,
  GlobeHemisphereWest,
  Heart,
  ImageSquare,
  InstagramLogo,
  Lightbulb,
  LockKey,
  MagicWand,
  Newspaper,
  NotePencil,
  Pause,
  Play,
  Plus,
  Robot,
  SelectionAll,
  SelectionPlus,
  ShieldCheck,
  SidebarSimple,
  SquaresFour,
  Sparkle,
  TiktokLogo,
  ThumbsDown,
  ThumbsUp,
  UserCircle,
  Users,
  X,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { useStudio } from "@/lib/useStudio";
import { useCreatorWorkspace, type InspirationWithCreator } from "@/lib/useCreatorWorkspace";
import { humanPieceStatus } from "@/lib/challengePiece";
import type {
  ActivityRecord,
  BrainCategory,
  BrainRecord,
  CarouselSlide,
  ContextReceipt,
  CreatorPlatform,
  CreatorRecord,
  PieceRecord,
} from "@/lib/types";
import type { ArutleeView } from "@/lib/webmcp/types";
import { useArutleeWebMCP, type WebMCPState } from "@/lib/webmcp/useArutleeWebMCP";
import {
  WEBMCP_PREFERENCES_KEY,
  capabilityEnabled,
  createDefaultWebMCPPreferences,
  normalizeWebMCPPreferences,
  setCapabilityEnabled,
  webmcpCapabilities,
  webmcpToolNames,
  type WebMCPPreferences,
  type WebMCPToolName,
} from "@/lib/webmcp/preferences";
import {
  SHARED_ATTENTION_LIMIT,
  addSharedAttention,
  dismissAttentionAnnotations,
  selectedTextRange,
  setSharedAttentionRole,
  toggleSharedAttention,
  type SharedAttentionGeometry,
  type SharedAttentionPoint,
  type SharedAttentionRole,
  type SharedAttentionSelection,
} from "@/lib/sharedAttention";
import { PieceScroll } from "@/components/PieceScroll";
import { AttentionInk } from "@/components/creator/AttentionInk";
import { TemplateStudio } from "@/components/creator/TemplateStudio";
import { parseSourceIntake, type SourceIntakeDraft } from "@/lib/sourceIntake";
import { isUnstartedSession, isVibeSession } from "@/lib/session";
import {
  pointerButtonsMask,
  pointerGestureAction,
  type PointerButtonPreference,
} from "@/lib/pointerControls";

type Studio = ReturnType<typeof useStudio>;
type Workspace = ReturnType<typeof useCreatorWorkspace>;

const categories: Array<{ id: BrainCategory; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "audience", label: "Audience" },
  { id: "voice", label: "Voice" },
  { id: "visual_taste", label: "Visual taste" },
  { id: "content_goal", label: "Goals" },
  { id: "production_rule", label: "Production rules" },
  { id: "example", label: "Examples" },
  { id: "learning", label: "Recent learning" },
];

const inspirationSections: Array<{
  id: CreatorPlatform;
  label: string;
  description: string;
}> = [
  { id: "youtube", label: "YouTube", description: "Videos, interviews, and build sessions" },
  { id: "tiktok", label: "TikTok", description: "Hooks, formats, and fast cultural signals" },
  { id: "instagram", label: "Instagram", description: "Reels, carousels, and visual systems" },
  { id: "facebook", label: "Facebook", description: "Posts, communities, and longer reactions" },
  { id: "news", label: "News", description: "Publications and current stories" },
  { id: "web", label: "Websites", description: "Products, essays, and reference pages" },
];

function InspirationPlatformIcon({ platform, size = 17 }: { platform: CreatorPlatform; size?: number }) {
  if (platform === "youtube") return <YoutubeLogo size={size} weight="fill" />;
  if (platform === "tiktok") return <TiktokLogo size={size} weight="fill" />;
  if (platform === "instagram") return <InstagramLogo size={size} weight="duotone" />;
  if (platform === "facebook") return <FacebookLogo size={size} weight="fill" />;
  if (platform === "news") return <Newspaper size={size} weight="duotone" />;
  return <GlobeHemisphereWest size={size} weight="duotone" />;
}

function surfaceLabel(view: ArutleeView): string {
  return view === "piece" ? "Session" : view === "template" ? "Template" : view === "schedule" ? "Schedule" : "Inspire";
}

function normalizedAttentionPoint(event: ReactPointerEvent<HTMLElement>): SharedAttentionPoint {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width))),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(1, rect.height))),
  };
}

function interactivePointerTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const control = target.closest("button, a, input, textarea, select, label, summary, [role='button'], [role='link'], [contenteditable='true']");
  if (control instanceof HTMLElement) return control;
  return target.matches(".creator-dialog-backdrop") && target instanceof HTMLElement ? target : null;
}

function activateInteractivePointerTarget(target: EventTarget | null): void {
  const control = interactivePointerTarget(target);
  if (!control || control.getAttribute("aria-disabled") === "true" || ("disabled" in control && control.disabled)) return;

  if (control instanceof HTMLTextAreaElement || control.isContentEditable) {
    control.focus();
    return;
  }
  if (control instanceof HTMLSelectElement) {
    control.focus();
    try { control.showPicker(); } catch { control.click(); }
    return;
  }
  if (control instanceof HTMLInputElement) {
    const clickTypes = new Set(["button", "checkbox", "color", "date", "datetime-local", "file", "month", "radio", "range", "reset", "submit", "time", "week"]);
    if (clickTypes.has(control.type)) control.click();
    else control.focus();
    return;
  }
  control.click();
}

function drawingDistance(points: SharedAttentionPoint[]): number {
  return points.slice(1).reduce((total, point, index) => {
    const previous = points[index];
    return total + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0);
}

function mediaUrl(record: InspirationWithCreator | null): string | null {
  return record?.media_path ?? null;
}

function pieceMedia(slide?: CarouselSlide): string | null {
  if (slide?.asset_path) return `/api/file?path=${encodeURIComponent(slide.asset_path)}`;
  if (slide?.background_path) return `/api/file?path=${encodeURIComponent(slide.background_path)}`;
  return null;
}

function prettyStatus(piece: PieceRecord): string {
  const status = humanPieceStatus(piece);
  return status === "live" ? "Live" : status === "ready" ? "Ready" : status === "scheduled" ? "Scheduled" : "Draft";
}

function relativeTime(value: string): string {
  const delta = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function ReadyState({ state }: { state: WebMCPState }) {
  const label = state === "ready"
    ? "Codex ready"
    : state === "legacy-preview"
      ? "Codex preview"
      : state === "disabled"
        ? "WebMCP access off"
        : state === "error"
          ? "Codex needs attention"
          : "Codex available in WebMCP";
  return (
    <div className="creator-agent-state">
      <span className={`creator-agent-dot ${state === "ready" || state === "legacy-preview" ? "is-ready" : ""}`} />
      <span>{label}</span>
    </div>
  );
}

const attentionRoleLabels: Record<SharedAttentionRole, string> = {
  change: "Change",
  reference: "Use as reference",
  compare: "Compare",
  preserve: "Keep unchanged",
};

function AttentionTray(props: {
  selections: SharedAttentionSelection[];
  webmcp: WebMCPState;
  onRole: (key: string, role: SharedAttentionRole) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  if (!props.selections.length) return null;
  const connected = props.webmcp === "ready" || props.webmcp === "legacy-preview";
  return (
    <section className="creator-attention-tray" aria-label="Talking about">
      <div className="creator-attention-heading">
        <span><SelectionAll size={17} weight="duotone" /></span>
        <p><strong>Talking about</strong><small>{props.selections.length} selected · {connected ? "shared with Codex" : "ready to share"}</small></p>
      </div>
      <div className="creator-attention-items">
        {props.selections.map((item) => (
          <div key={item.key} className={`creator-attention-chip is-${item.kind}`} title={item.preview}>
            <span>{item.label}</span>
            <select value={item.role} aria-label={`Role for ${item.label}`} onChange={(event) => props.onRole(item.key, event.target.value as SharedAttentionRole)}>
              {Object.entries(attentionRoleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button onClick={() => props.onRemove(item.key)} aria-label={`Remove ${item.label} from shared attention`}><X size={12} /></button>
          </div>
        ))}
      </div>
      <button className="creator-attention-clear" onClick={props.onClear}>Clear</button>
    </section>
  );
}

function SharedAttentionGuide(props: {
  open: boolean;
  view: ArutleeView;
  selections: SharedAttentionSelection[];
  pointerButton: PointerButtonPreference;
  onView: (view: ArutleeView) => void;
  onClose: () => void;
}) {
  if (!props.open) return null;
  const step = props.selections.length === 0 ? 1 : props.selections.length === 1 ? 2 : 3;
  return (
    <aside className="creator-attention-guide" aria-live="polite" aria-label="Shared Attention first-use guide">
      <header>
        <div><span className="creator-eyebrow">Learn Shared Attention · {step} of 3</span><strong>Point instead of prompting</strong></div>
        <button className="creator-icon-button" onClick={props.onClose} aria-label="Close guide"><X size={16} /></button>
      </header>
      {step === 1 && (
        <div className="creator-guide-step">
          <span className="creator-guide-icon"><Lightbulb size={20} weight="duotone" /></span>
          <div><h2>Select your first reference</h2><p>Open an inspiration and choose <strong>Add to Talking about</strong>. VibeStudio will share that exact source with your agent.</p></div>
          <button className="creator-primary-button" onClick={() => props.onView("inspire")}>{props.view === "inspire" ? "I’m ready to select" : "Open Inspire"}</button>
        </div>
      )}
      {step === 2 && (
        <div className="creator-guide-step">
          <span className="creator-guide-icon"><SelectionPlus size={20} weight="duotone" /></span>
          <div><h2>Add another place</h2><p>Select a Template rule, open a Session and choose a slide, or {props.pointerButton === "right" ? "right-click anywhere to point. Right-drag" : "left-click anywhere to point. Left-drag"} lets you draw exactly what you mean. Use the other button to open controls and clear the pointer.</p></div>
          <div className="creator-guide-actions"><button className="creator-secondary-button" onClick={() => props.onView("template")}>Open Template</button><button className="creator-primary-button" onClick={() => props.onView("piece")}>Open a Session</button></div>
        </div>
      )}
      {step === 3 && (
        <div className="creator-guide-step">
          <span className="creator-guide-icon"><Robot size={20} weight="duotone" /></span>
          <div><h2>Now talk naturally</h2><p>Use the tray to mark each item as Change, Reference, Compare, or Keep unchanged. Points and drawings travel with the rest of the context. Then ask your agent:</p><blockquote>“Use these together. Change the selected area, use the inspiration as reference, and preserve my voice rule.”</blockquote></div>
          <button className="creator-primary-button" onClick={props.onClose}><Check size={16} /> Finish tutorial</button>
        </div>
      )}
    </aside>
  );
}

function SessionRail(props: {
  view: ArutleeView;
  setView: (view: ArutleeView) => void;
  studio: Studio;
  webmcp: WebMCPState;
  pointerButton: PointerButtonPreference;
  busy: string | null;
  onNewSession: () => void;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
}) {
  const challengePieces = props.studio.pieces
    .filter(isVibeSession)
    .sort((a, b) => (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at));
  return (
    <aside className="creator-rail">
      <div className="creator-brand">
        <div className="creator-mark">V</div>
        <span>VibeStudio</span>
        <button aria-label="Collapse sidebar"><SidebarSimple size={17} /></button>
      </div>
      <nav className="creator-primary-nav" aria-label="Creator workspace">
        <button className={props.view === "inspire" ? "is-active" : ""} onClick={() => props.setView("inspire")}>
          <Lightbulb size={18} weight="duotone" /> Inspire
        </button>
        <button className={props.view === "schedule" ? "is-active" : ""} onClick={() => props.setView("schedule")}>
          <CalendarBlank size={18} weight="duotone" /> Schedule
        </button>
        <button className={props.view === "template" ? "is-active" : ""} onClick={() => props.setView("template")}>
          <SquaresFour size={18} weight="duotone" /> Template
        </button>
      </nav>
      <div className="creator-rail-label creator-session-heading">
        <span>Sessions</span>
        <button
          onClick={props.onNewSession}
          disabled={props.busy === "session"}
          aria-label={props.busy === "session" ? "Opening a new Session" : "Start a new Session"}
          title="Start a new Session"
        ><Plus size={13} weight="bold" /></button>
      </div>
      <div className="creator-session-list">
        {challengePieces.length ? challengePieces.slice(0, 7).map((piece) => (
          <button
            key={piece.id}
            data-connection={piece.session_connection_status ?? "waiting"}
            className={props.studio.selectedId === piece.id && props.view === "piece" ? "is-selected" : ""}
            onClick={() => { props.studio.setSelectedId(piece.id); props.setView("piece"); }}
          >
            <span>{piece.title}</span>
            <small data-status={prettyStatus(piece).toLowerCase()}>{prettyStatus(piece)}</small>
          </button>
        )) : (
          <p className="creator-empty-note">Your first carousel session will appear here.</p>
        )}
      </div>
      <div className="creator-rail-bottom">
        <button className="creator-guide-launch" onClick={props.onOpenGuide}><SelectionAll size={15} /> <span>Shared Attention guide</span></button>
        <button className="creator-guide-launch creator-settings-launch" onClick={props.onOpenSettings}><GearSix size={15} /> <span>Agent settings</span></button>
        <ReadyState state={props.webmcp} />
        <p>{props.pointerButton === "right" ? "Right-click points. Left-click opens + clears." : "Left-click points. Right-click opens + clears."}</p>
      </div>
    </aside>
  );
}

function SettingsSwitch(props: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      className={`creator-settings-switch ${props.checked ? "is-on" : ""}`}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); props.onChange(!props.checked); }}
    >
      <span />
    </button>
  );
}

function AgentSettingsDialog(props: {
  preference: PointerButtonPreference;
  onPointerChange: (preference: PointerButtonPreference) => void;
  webmcpPreferences: WebMCPPreferences;
  onWebMCPChange: (preferences: WebMCPPreferences) => void;
  onClose: () => void;
}) {
  const [section, setSection] = useState<"webmcp" | "pointer">("webmcp");
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [props.onClose]);

  const enabledCount = webmcpToolNames.filter((name) => props.webmcpPreferences.tools[name]).length;
  const setTool = (name: WebMCPToolName, enabled: boolean) => {
    props.onWebMCPChange({
      ...props.webmcpPreferences,
      tools: { ...props.webmcpPreferences.tools, [name]: enabled },
    });
  };

  return (
    <div className="creator-dialog-backdrop" role="presentation" onClick={props.onClose}>
      <section className="creator-dialog creator-agent-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="agent-settings-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span className="creator-eyebrow">Human + agent control</span><h2 id="agent-settings-title">Agent settings</h2></div>
          <button className="creator-icon-button" onClick={props.onClose} aria-label="Close agent settings"><X size={18} /></button>
        </header>
        <nav className="creator-settings-nav" aria-label="Agent settings sections">
          <button className={section === "webmcp" ? "is-active" : ""} onClick={() => setSection("webmcp")}><Robot size={15} /> WebMCP access</button>
          <button className={section === "pointer" ? "is-active" : ""} onClick={() => setSection("pointer")}><SelectionAll size={15} /> Pointer controls</button>
        </nav>

        {section === "webmcp" ? (
          <div className="creator-webmcp-settings">
            <section className="creator-webmcp-master">
              <div className="creator-webmcp-master-icon"><ShieldCheck size={20} weight="duotone" /></div>
              <div>
                <strong>Allow agent access</strong>
                <p>Share only the functions you choose with Codex through WebMCP.</p>
              </div>
              <SettingsSwitch
                checked={props.webmcpPreferences.enabled}
                label="Allow WebMCP agent access"
                onChange={(enabled) => props.onWebMCPChange({ ...props.webmcpPreferences, enabled })}
              />
            </section>
            <div className="creator-webmcp-receipt" data-enabled={props.webmcpPreferences.enabled ? "true" : "false"}>
              <span>{props.webmcpPreferences.enabled ? `${enabledCount} of ${webmcpToolNames.length} functions shared` : "No functions are registered with the agent"}</span>
              <small>Turning a function off removes it from the agent, not just from this screen.</small>
            </div>
            <div className={`creator-webmcp-capabilities ${props.webmcpPreferences.enabled ? "" : "is-master-off"}`}>
              {webmcpCapabilities.map((capability) => {
                const allEnabled = capabilityEnabled(props.webmcpPreferences, capability);
                const count = capability.tools.filter((tool) => props.webmcpPreferences.tools[tool.name]).length;
                return (
                  <details key={capability.id} className="creator-webmcp-capability">
                    <summary>
                      <div><strong>{capability.title}</strong><small>{capability.description}</small></div>
                      <span>{count}/{capability.tools.length} on</span>
                      <SettingsSwitch
                        checked={allEnabled}
                        label={`${allEnabled ? "Disable" : "Enable"} every ${capability.title} function`}
                        onChange={(enabled) => props.onWebMCPChange(setCapabilityEnabled(props.webmcpPreferences, capability, enabled))}
                      />
                    </summary>
                    <div className="creator-webmcp-tool-list">
                      {capability.tools.map((tool) => (
                        <div key={tool.name} className="creator-webmcp-tool">
                          <div>
                            <span><strong>{tool.title}</strong><em data-access={tool.access}>{tool.access === "read" ? "Read only" : "Can change"}</em></span>
                            <p>{tool.description}</p>
                            <code>{tool.name}</code>
                          </div>
                          <SettingsSwitch checked={props.webmcpPreferences.tools[tool.name]} label={`${props.webmcpPreferences.tools[tool.name] ? "Disable" : "Enable"} ${tool.title}`} onChange={(enabled) => setTool(tool.name, enabled)} />
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
            <p className="creator-webmcp-safety"><LockKey size={14} /> VibeStudio never exposes a publish or delete function. Scheduling and reusable Template changes remain separately controllable.</p>
          </div>
        ) : (
          <div className="creator-pointer-settings">
            <p className="creator-dialog-copy">Choose which mouse button points or draws for your agent. VibeStudio remembers this on this device.</p>
            <div className="creator-pointer-options" role="radiogroup" aria-label="Pointer button preference">
              <button role="radio" aria-checked={props.preference === "right"} className={props.preference === "right" ? "is-selected" : ""} onClick={() => props.onPointerChange("right")}>
                <span className="creator-pointer-radio">{props.preference === "right" && <Check size={13} weight="bold" />}</span>
                <span><strong>Right-click points</strong><small>Left-click opens controls + dismisses pointers</small></span>
                <em>Default</em>
              </button>
              <button role="radio" aria-checked={props.preference === "left"} className={props.preference === "left" ? "is-selected" : ""} onClick={() => props.onPointerChange("left")}>
                <span className="creator-pointer-radio">{props.preference === "left" && <Check size={13} weight="bold" />}</span>
                <span><strong>Left-click points</strong><small>Right-click opens controls + dismisses pointers</small></span>
              </button>
            </div>
            <p className="creator-pointer-note"><ShieldCheck size={15} weight="duotone" /> The browser context menu stays off inside VibeStudio so the pointing gesture is consistent.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function CreatorManager(props: {
  creators: CreatorRecord[];
  busy: string | null;
  onClose: () => void;
  onChange: (creator: CreatorRecord, status: CreatorRecord["status"]) => void;
}) {
  return (
    <div className="creator-dialog-backdrop" role="presentation" onClick={props.onClose}>
      <section className="creator-dialog" role="dialog" aria-modal="true" aria-labelledby="creator-manager-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span className="creator-eyebrow">Inspiration sources</span><h2 id="creator-manager-title">Sources you follow</h2></div>
          <button className="creator-icon-button" onClick={props.onClose} aria-label="Close creator manager"><X size={18} /></button>
        </header>
        <p className="creator-dialog-copy">Pause someone without losing what you already learned from their work.</p>
        <div className="creator-manager-list">
          {props.creators.map((creator) => (
            <div key={creator.id}>
              <div className="creator-avatar"><UserCircle size={22} weight="duotone" /></div>
              <div><strong>{creator.display_name}</strong><span>@{creator.handle} · {creator.platform}</span></div>
              <button
                className={creator.status === "active" ? "creator-text-button" : "creator-small-button"}
                disabled={props.busy === "creator"}
                onClick={() => props.onChange(creator, creator.status === "active" ? "paused" : "active")}
              >
                {creator.status === "active" ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Restore</>}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AddSourceDialog(props: {
  busy: string | null;
  onClose: () => void;
  onAdd: (input: Pick<CreatorRecord, "platform" | "handle" | "display_name" | "profile_url" | "note">) => Promise<unknown>;
}) {
  const [input, setInput] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [error, setError] = useState("");
  const detected = useMemo(() => input.trim() ? parseSourceIntake(input).mode : null, [input]);
  const submit = async () => {
    setInterpreting(true);
    setError("");
    try {
      const response = await fetch("/api/ai/source-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await response.json() as { draft?: SourceIntakeDraft; error?: string };
      if (!response.ok || !data.draft) throw new Error(data.error || "VibeStudio could not understand that source.");
      const { platform, handle, display_name, profile_url, note } = data.draft;
      const result = await props.onAdd({ platform, handle, display_name, profile_url, note });
      if (result) props.onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setInterpreting(false);
    }
  };
  return (
    <div className="creator-dialog-backdrop" role="presentation" onClick={props.onClose}>
      <section className="creator-dialog creator-source-dialog" role="dialog" aria-modal="true" aria-labelledby="add-source-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span className="creator-eyebrow">Curate your inputs</span><h2 id="add-source-title">Follow a new source</h2></div>
          <button className="creator-icon-button" onClick={props.onClose} aria-label="Close add source"><X size={18} /></button>
        </header>
        <p className="creator-dialog-copy">Paste a link or describe what you want to follow. VibeStudio will recognize the source, platform, and your reason.</p>
        <div className="creator-source-intake">
          <label htmlFor="source-intake">Link or description</label>
          <textarea
            id="source-intake"
            autoFocus
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={'Paste https://youtube.com/@creator\n\nor type “Follow Lenny’s Podcast for product storytelling”'}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && input.trim()) void submit();
            }}
          />
          <div className="creator-source-detection" data-mode={detected ?? "empty"}>
            <Sparkle size={14} weight="fill" />
            <span>{detected === "link" ? "Link detected — details will be inferred" : detected === "mixed" ? "Link + context detected — both will be kept" : detected === "text" ? "Natural language detected — VibeStudio will structure it" : "One field is enough. You can paste or type naturally."}</span>
          </div>
          {error && <p className="creator-source-error" role="alert">{error}</p>}
        </div>
        <footer><button className="creator-text-button" onClick={props.onClose}>Cancel</button><button className="creator-primary-button" disabled={!input.trim() || interpreting || props.busy === "creator"} onClick={() => void submit()}><Sparkle size={16} weight="fill" /> {interpreting ? "Understanding…" : "Add to Inspire"}</button></footer>
      </section>
    </div>
  );
}

function InspireView(props: {
  workspace: Workspace;
  onCreate: (source: InspirationWithCreator) => void;
  attention: SharedAttentionSelection[];
  onToggleAttention: (selection: SharedAttentionSelection) => void;
}) {
  const { workspace } = props;
  const source = workspace.selectedInspiration;
  const sourceAttentionKey = source ? `inspiration:${source.id}` : "";
  const sourceIsAttention = props.attention.some((item) => item.key === sourceAttentionKey);
  const [reactionNote, setReactionNote] = useState("");
  const [showCreators, setShowCreators] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<CreatorPlatform>>(() => new Set());

  useEffect(() => setReactionNote(source?.reaction_note ?? ""), [source?.id, source?.reaction_note]);
  return (
    <div className="creator-inspire-layout">
      <section className="creator-inspire-main">
        <header className="creator-view-header">
          <div><span className="creator-eyebrow">Your multimodal creative radar</span><h1>Inspire</h1><p>Follow broadly. Save selectively. Teach VibeStudio what feels like you.</p></div>
          <div className="creator-view-actions"><button className="creator-secondary-button" onClick={() => setShowCreators(true)}><Users size={16} /> Manage sources</button><button className="creator-primary-button" onClick={() => setShowAddSource(true)}><Plus size={16} /> Add source</button></div>
        </header>

        <div className="creator-source-sections" aria-label="Multimodal inspiration feed">
          {inspirationSections.map((section) => {
            const items = workspace.inspirations.filter((item) => item.status !== "archived" && item.platform === section.id);
            const followed = workspace.creators.filter((creator) => creator.status === "active" && creator.platform === section.id).length;
            const expanded = expandedPlatforms.has(section.id);
            const visibleItems = expanded ? items : items.slice(0, 6);
            return (
              <section key={section.id} className="creator-source-section">
                <header>
                  <span className="creator-source-section-icon"><InspirationPlatformIcon platform={section.id} /></span>
                  <div><h2>{section.label}</h2><p>{section.description}</p></div>
                  <div className="creator-source-section-actions">
                    <small>{items.length} items · {followed} followed</small>
                    <button
                      className="creator-source-see-all"
                      disabled={!items.length}
                      onClick={() => setExpandedPlatforms((current) => {
                        const next = new Set(current);
                        if (next.has(section.id)) next.delete(section.id);
                        else next.add(section.id);
                        return next;
                      })}
                    >
                      {expanded ? "Show less" : "See all"} <ArrowRight size={13} />
                    </button>
                  </div>
                </header>
                <div className="creator-source-row">
                  {visibleItems.map((item) => (
                    <button key={item.id} className={source?.id === item.id ? "is-selected" : ""} onClick={() => workspace.setSelectedInspirationId(item.id)}>
                      <span className="creator-source-media">{item.media_path ? <img src={item.media_path} alt="" /> : <span className="creator-missing-thumb"><InspirationPlatformIcon platform={item.platform} size={23} /></span>}<small>{item.media_kind.replaceAll("_", " ")}</small>{item.status === "saved" && <BookmarkSimple className="creator-source-saved" size={14} weight="fill" />}</span>
                      <strong>{item.title}</strong>
                      <em>{item.creator?.display_name ?? item.platform}</em>
                    </button>
                  ))}
                  {!items.length && <p>No items yet. Follow a source and new work will arrive here.</p>}
                  <button className="creator-source-add-card" onClick={() => setShowAddSource(true)}><Plus size={17} /><span>Add {section.label} source</span></button>
                </div>
              </section>
            );
          })}
        </div>

        <div className={`creator-source-stage ${sourceIsAttention ? "is-attention" : ""}`}>
          {source && mediaUrl(source) ? (
            <img src={mediaUrl(source) ?? ""} alt={source.title} />
          ) : (
            <div className="creator-source-unavailable">
              <ImageSquare size={42} weight="thin" />
              <strong>Original post not cached</strong>
              <span>The creator is still tracked. Add the source when you have it.</span>
            </div>
          )}
          <div className="creator-source-stage-meta">
            <span>{source?.platform ?? "source"}</span>
            <span>{source?.media_kind === "unavailable" ? "Reference only" : "Saved locally"}</span>
          </div>
        </div>

        <div className="creator-system-chain" aria-label="How VibeStudio creates consistently">
          <div><ImageSquare size={18} /><span><strong>Source inspiration</strong><small>External material</small></span></div>
          <ArrowRight size={15} />
          <div><SquaresFour size={18} /><span><strong>Your Template</strong><small>Editable creation system</small></span></div>
          <ArrowRight size={15} />
          <div><MagicWand size={18} /><span><strong>Carousel skill</strong><small>Reusable method</small></span></div>
        </div>
      </section>

      <aside className="creator-detail-panel">
        {source ? (
          <>
            <div className="creator-detail-person">
              <div className="creator-avatar"><UserCircle size={24} weight="duotone" /></div>
              <div><strong>{source.creator?.display_name ?? "Saved source"}</strong><span>{source.creator ? `@${source.creator.handle}` : source.platform}</span></div>
              <button className="creator-icon-button" aria-label="More source options"><DotsThree size={20} weight="bold" /></button>
            </div>
            <div className="creator-detail-copy">
              <span className="creator-eyebrow">Why this fits</span>
              <h2>{source.title}</h2>
              <p>{source.saved_reason || source.caption}</p>
            </div>
            <div className="creator-reaction-box">
              <span>What should VibeStudio remember?</span>
              <div className="creator-reaction-buttons">
                <button className={source.reaction === "like" ? "is-active" : ""} onClick={() => void workspace.react(source, source.reaction === "like" ? "none" : "like", reactionNote)}><ThumbsUp size={18} weight={source.reaction === "like" ? "fill" : "regular"} /> Like</button>
                <button className={source.reaction === "dislike" ? "is-active dislike" : ""} onClick={() => void workspace.react(source, source.reaction === "dislike" ? "none" : "dislike", reactionNote)}><ThumbsDown size={18} weight={source.reaction === "dislike" ? "fill" : "regular"} /> Not for me</button>
              </div>
              <textarea value={reactionNote} onChange={(event) => setReactionNote(event.target.value)} placeholder="e.g. I like the unexpected metaphor, but not the busy caption." />
              <button className="creator-text-button" disabled={workspace.busy === "reaction"} onClick={() => void workspace.react(source, source.reaction === "none" ? "like" : source.reaction, reactionNote)}>Save note</button>
            </div>
            <button className={`creator-secondary-button creator-save-source ${source.status === "saved" ? "is-active" : ""}`} disabled={workspace.busy === "inspiration"} onClick={() => void workspace.setInspirationSaved(source, source.status !== "saved")}><BookmarkSimple size={16} weight={source.status === "saved" ? "fill" : "regular"} /> {source.status === "saved" ? "Saved to taste library" : "Save inspiration"}</button>
            <button
              className={`creator-secondary-button creator-attention-toggle ${sourceIsAttention ? "is-active" : ""}`}
              onClick={() => props.onToggleAttention({
                key: sourceAttentionKey,
                kind: "inspiration",
                entityId: source.id,
                label: `Inspiration · ${source.creator?.display_name ?? source.platform}`,
                preview: `${source.title}. ${source.reaction_note || source.saved_reason || source.caption}`,
                role: "reference",
                version: source.version,
              })}
            >
              {sourceIsAttention ? <Check size={16} /> : <SelectionPlus size={16} />} {sourceIsAttention ? "In shared attention" : "Add to Talking about"}
            </button>
            <button className="creator-primary-button creator-create-button" disabled={workspace.busy === "create"} onClick={() => props.onCreate(source)}>
              <Sparkle size={18} weight="fill" /> {workspace.busy === "create" ? "Creating your Draft…" : "Create from this"}
            </button>
            <div className="creator-memory-receipt">
              <div><SquaresFour size={17} /><strong>Template learning</strong><span>{source.reaction === "none" ? "Waiting for your signal" : "Taste evidence saved"}</span></div>
              <p>{source.reaction_note || "Like, dislike, or add a short note. You can edit what VibeStudio learns at any time."}</p>
            </div>
          </>
        ) : <p className="creator-empty-note">Choose a saved reference to begin.</p>}
      </aside>
      {showCreators && <CreatorManager creators={workspace.creators} busy={workspace.busy} onClose={() => setShowCreators(false)} onChange={(creator, status) => void workspace.updateCreator(creator, status)} />}
      {showAddSource && <AddSourceDialog busy={workspace.busy} onClose={() => setShowAddSource(false)} onAdd={(input) => workspace.addCreator(input)} />}
    </div>
  );
}

function TemplateRuleCard(props: {
  record: BrainRecord;
  busy: string | null;
  selectedForAttention: boolean;
  onToggleAttention: () => void;
  onSave: (patch: Partial<BrainRecord>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(props.record.text);
  useEffect(() => setText(props.record.text), [props.record.text]);
  return (
    <article className={`creator-brain-card ${props.record.status === "proposed" ? "is-proposed" : ""} ${props.selectedForAttention ? "is-attention" : ""}`}>
      <div className="creator-brain-card-top">
        <span>{props.record.status === "proposed" ? "Agent suggestion · review" : `${props.record.authored_by === "palm" ? "You" : "VibeStudio"} · ${props.record.source_type.replaceAll("_", " ")}`}</span>
        <div className="creator-brain-card-actions">
          <button className={`creator-icon-button ${props.selectedForAttention ? "is-active" : ""}`} onClick={props.onToggleAttention} aria-label={props.selectedForAttention ? "Remove template rule from shared attention" : "Add template rule to shared attention"}>{props.selectedForAttention ? <Check size={15} /> : <SelectionPlus size={15} />}</button>
          <button className="creator-icon-button" onClick={() => setEditing((value) => !value)} aria-label="Edit template rule"><NotePencil size={16} /></button>
        </div>
      </div>
      {editing ? <textarea value={text} onChange={(event) => setText(event.target.value)} /> : <p>{props.record.text}</p>}
      <div className="creator-brain-card-bottom">
        <small>{props.record.tags.slice(0, 3).join(" · ")}</small>
        {editing ? (
          <div><button className="creator-text-button" onClick={() => setEditing(false)}>Cancel</button><button className="creator-small-button" disabled={props.busy === "brain"} onClick={() => { props.onSave({ text, status: props.record.status === "proposed" ? "active" : props.record.status }); setEditing(false); }}><Check size={14} /> Save</button></div>
        ) : props.record.status === "proposed" ? (
          <button className="creator-small-button" disabled={props.busy === "brain"} onClick={() => props.onSave({ status: "active" })}><Check size={14} /> Accept</button>
        ) : (
          <button className="creator-text-button" disabled={props.busy === "brain"} onClick={() => props.onSave({ status: "archived" })}>Archive</button>
        )}
      </div>
    </article>
  );
}

function TemplateView(props: {
  workspace: Workspace;
  attention: SharedAttentionSelection[];
  onToggleAttention: (selection: SharedAttentionSelection) => void;
}) {
  const { workspace } = props;
  const [category, setCategory] = useState<BrainCategory | "all">("all");
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const visible = workspace.brain.filter((record) => record.status !== "archived" && (category === "all" || record.category === category));
  return (
    <section className="creator-brain-view">
      <header className="creator-view-header">
        <div><span className="creator-eyebrow">Your reusable creation system</span><h1>Template</h1><p>Brand, voice, visual rules, examples, and production methods every agent can reuse.</p></div>
        <button className="creator-primary-button" onClick={() => setAdding(true)}><Plus size={16} /> Add rule</button>
      </header>
      <div className="creator-brain-summary">
        <div><SquaresFour size={22} weight="duotone" /><span><strong>{workspace.brain.filter((item) => item.status === "active").length}</strong><small>active rules</small></span></div>
        <div><Sparkle size={22} weight="duotone" /><span><strong>{workspace.brain.filter((item) => item.status === "proposed").length}</strong><small>suggested improvements</small></span></div>
        <p>VibeStudio assembles the relevant parts of this Template for each Session. Every rule stays visible and editable.</p>
      </div>
      <div className="creator-filter-row">
        <button className={category === "all" ? "is-active" : ""} onClick={() => setCategory("all")}>All</button>
        {categories.map((item) => <button key={item.id} className={category === item.id ? "is-active" : ""} onClick={() => setCategory(item.id)}>{item.label}</button>)}
      </div>
      {adding && (
        <div className="creator-add-memory">
          <div><strong>Add one reusable rule</strong><span>Keep it specific enough to edit later.</span></div>
          <textarea value={newText} onChange={(event) => setNewText(event.target.value)} placeholder="I prefer specific product evidence over decorative AI imagery." />
          <div><button className="creator-text-button" onClick={() => setAdding(false)}>Cancel</button><button className="creator-small-button" disabled={!newText.trim() || workspace.busy === "brain"} onClick={() => { void workspace.addBrain(category === "all" ? "visual_taste" : category, newText); setNewText(""); setAdding(false); }}><Check size={14} /> Add</button></div>
        </div>
      )}
      <div className="creator-brain-grid">
        {visible.map((record) => {
          const attentionKey = `memory:${record.id}`;
          return (
            <TemplateRuleCard
              key={record.id}
              record={record}
              busy={workspace.busy}
              selectedForAttention={props.attention.some((item) => item.key === attentionKey)}
              onToggleAttention={() => props.onToggleAttention({
                key: attentionKey,
                kind: "memory",
                entityId: record.id,
                label: `${record.category.replaceAll("_", " ")} template rule`,
                preview: record.text,
                role: "preserve",
                version: record.version,
              })}
              onSave={(patch) => void workspace.saveBrain(record, patch)}
            />
          );
        })}
      </div>
    </section>
  );
}

function formatScheduleTime(value?: string): string {
  if (!value) return "Time not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ScheduleView(props: {
  studio: Studio;
  onOpenSession: (piece: PieceRecord) => void;
}) {
  const pieces = props.studio.pieces
    .filter((piece) => piece.skill_id === "carousel-v1")
    .sort((a, b) => (a.scheduled_for ?? a.updated_at ?? a.created_at).localeCompare(b.scheduled_for ?? b.updated_at ?? b.created_at));
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const tomorrow = useMemo(() => {
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    date.setHours(9, 0, 0, 0);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }, []);
  const [when, setWhen] = useState(tomorrow);
  const groups: Array<{ id: "ready" | "scheduled" | "live"; title: string; description: string }> = [
    { id: "ready", title: "Ready to schedule", description: "Finished and waiting for a publishing time" },
    { id: "scheduled", title: "Upcoming", description: "Placed on the calendar, still under your control" },
    { id: "live", title: "Live", description: "Published work and its final links" },
  ];
  return (
    <section className="creator-schedule-view">
      <header className="creator-view-header">
        <div><span className="creator-eyebrow">From finished work to public presence</span><h1>Schedule</h1><p>See what is ready, what is coming next, and what is already live.</p></div>
        <div className="creator-schedule-summary"><strong>{pieces.filter((piece) => humanPieceStatus(piece) === "scheduled").length}</strong><span>upcoming</span></div>
      </header>
      <div className="creator-schedule-board">
        {groups.map((group) => {
          const items = pieces.filter((piece) => humanPieceStatus(piece) === group.id);
          return (
            <section key={group.id} className={`creator-schedule-column is-${group.id}`}>
              <header><div><span className="creator-schedule-dot" /><h2>{group.title}</h2></div><strong>{items.length}</strong><p>{group.description}</p></header>
              <div className="creator-schedule-list">
                {items.map((piece) => {
                  const media = pieceMedia(piece.carousel?.slice().sort((a, b) => a.index - b.index)[0]);
                  return (
                    <article key={piece.id} className="creator-schedule-card">
                      <button className="creator-schedule-preview" onClick={() => props.onOpenSession(piece)}>{media ? <img src={media} alt="" /> : <span><ImageSquare size={24} /></span>}</button>
                      <div className="creator-schedule-copy"><button onClick={() => props.onOpenSession(piece)}>{piece.title}</button><p>{group.id === "ready" ? "Ready when you are" : formatScheduleTime(piece.scheduled_for)}</p><div>{piece.platforms.slice(0, 3).map((platform) => <span key={platform}>{platform}</span>)}</div></div>
                      {group.id === "ready" && schedulingId !== piece.id && <button className="creator-small-button" onClick={() => setSchedulingId(piece.id)}><CalendarBlank size={14} /> Schedule</button>}
                      {group.id === "ready" && schedulingId === piece.id && <div className="creator-schedule-form"><input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} /><div><button className="creator-text-button" onClick={() => setSchedulingId(null)}>Cancel</button><button className="creator-small-button" disabled={!when || Boolean(props.studio.busy.schedule)} onClick={() => { void props.studio.schedule(piece, new Date(when).toISOString()).then(() => setSchedulingId(null)); }}><Check size={13} /> Confirm</button></div></div>}
                    </article>
                  );
                })}
                {!items.length && <div className="creator-schedule-empty"><CalendarBlank size={24} weight="thin" /><p>{group.id === "ready" ? "Finish a Session and mark it Ready." : group.id === "scheduled" ? "Scheduled work will appear here." : "Published work will collect here."}</p></div>}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function ActivityTrail(props: { activities: ActivityRecord[]; piece: PieceRecord; busy: string | null; onUndo: (activity: ActivityRecord) => void }) {
  const relevant = props.activities.filter((activity) => activity.entity_id === props.piece.id || activity.entity_id.startsWith(`${props.piece.id}:`)).slice(0, 8);
  const actor = (activity: ActivityRecord) => activity.actor === "palm" ? "You" : activity.actor === "codex" ? "Codex" : "System";
  return (
    <div className="creator-activity-trail">
      <div className="creator-section-title"><ClockCounterClockwise size={16} /><strong>Shared activity</strong><span>version {props.piece.current_version ?? 1}</span></div>
      {relevant.length ? relevant.map((activity) => (
        <div key={activity.id} className={`creator-activity-row is-${activity.actor}`}>
          <span className="creator-activity-avatar" aria-hidden="true">
            {activity.actor === "palm" ? <UserCircle size={14} /> : activity.actor === "codex" ? <Robot size={14} /> : <ShieldCheck size={14} />}
          </span>
          <p><strong>{activity.summary}</strong><small>{actor(activity)} · {relativeTime(activity.created_at)}</small></p>
          {activity.reversible && !activity.undone_at && <button disabled={props.busy === "undo"} onClick={() => props.onUndo(activity)}>Undo</button>}
          {activity.undone_at && <span className="creator-activity-result">Undone</span>}
          {!activity.reversible && !activity.undone_at && <span className="creator-activity-result">Recorded</span>}
        </div>
      )) : <p className="creator-empty-note">Actions for this piece will appear here.</p>}
    </div>
  );
}

function CollaborationBar(props: {
  piece: PieceRecord;
  activities: ActivityRecord[];
  busy: string | null;
  webmcp: WebMCPState;
  onReview: () => void;
}) {
  const relevant = props.activities.filter((activity) => activity.entity_id === props.piece.id || activity.entity_id.startsWith(`${props.piece.id}:`));
  const latest = relevant[0] ?? null;
  const working = props.busy === "finish" || props.piece.operation?.status === "working";
  const needsReview = props.piece.operation?.status === "needs_review";
  const hasError = props.piece.operation?.status === "error";
  const reviewed = props.piece.operation?.name === "collaboration_review";
  const connected = props.piece.session_connection_status === "connected";
  const unstarted = isUnstartedSession(props.piece);
  const agentSurfaceReady = props.webmcp === "ready" || props.webmcp === "legacy-preview";
  const waiting = !connected;
  const state = working
    ? { tone: "working", eyebrow: "Codex is working", title: props.piece.operation?.message ?? "Building the next version", copy: "You can keep this page open. Progress and every saved change will appear here." }
    : unstarted && connected
      ? { tone: "handoff", eyebrow: "Codex connected", title: "Ready for your direction", copy: "Talk to Codex naturally. Its first saved draft will appear in this Session." }
    : waiting
      ? { tone: "waiting", eyebrow: "Waiting for Codex", title: "The shared Session is open", copy: "Tell your current Codex task: “Connect to this VibeStudio Session.” The receipt keeps both sides on this exact workspace." }
    : needsReview
      ? { tone: "review", eyebrow: "Your turn", title: "Review Codex’s latest work", copy: "Keep it, edit it yourself, or undo it. Nothing is published without you." }
      : hasError
        ? { tone: "error", eyebrow: "Needs attention", title: props.piece.operation?.message ?? "The last agent action stopped", copy: "Your current saved version is still intact." }
        : reviewed
          ? { tone: "synced", eyebrow: "In sync", title: "Ready for the next move", copy: "Codex will continue from the version you reviewed." }
          : latest?.actor === "palm"
            ? { tone: "handoff", eyebrow: "Codex can continue", title: "Your change is saved", copy: "The next agent action starts from this exact version." }
            : { tone: "handoff", eyebrow: "Your turn", title: "Shape the piece or ask Codex to continue", copy: "Both paths update the same versioned workspace." };
  return (
    <section className={`creator-collaboration-bar is-${state.tone}`} aria-live="polite">
      <div className="creator-collaboration-state">
        <span className="creator-collaboration-icon" aria-hidden="true">{working ? <Robot size={18} /> : needsReview ? <ArrowBendDownRight size={18} /> : <CheckCircle size={18} />}</span>
        <div><span>{state.eyebrow}</span><strong>{state.title}</strong><p>{state.copy}</p></div>
      </div>
      <div className="creator-collaboration-people" aria-label="Session collaborators">
        <span className="creator-collaborator-avatar is-human"><UserCircle size={17} weight="fill" /></span>
        <span className="creator-collaborator-avatar is-agent"><Robot size={16} weight="fill" /></span>
        <p><strong>You own the decision</strong><small>{connected ? `${props.piece.session_agent_label ?? "Codex"} connected to this Session` : agentSurfaceReady ? "WebMCP ready · Session receipt waiting" : "Open with a WebMCP-capable agent to connect"}</small></p>
      </div>
      {needsReview ? (
        <button className="creator-primary-button" disabled={props.busy === "review"} onClick={props.onReview}><Check size={16} /> {props.busy === "review" ? "Saving review…" : "Mark reviewed"}</button>
      ) : (
        <span className="creator-publish-lock"><LockKey size={14} /> Publishing stays with you</span>
      )}
    </section>
  );
}

function CollaborationInspector(props: { piece: PieceRecord; webmcp: WebMCPState }) {
  const connected = props.piece.session_connection_status === "connected";
  const available = props.webmcp === "ready" || props.webmcp === "legacy-preview";
  return (
    <div className="creator-inspector-block creator-collaboration-inspector">
      <div className="creator-section-title"><Users size={16} /><strong>Working together</strong><span>{connected ? "2 participants" : "1 + agent slot"}</span></div>
      <div className="creator-collaborator-row">
        <span className="creator-collaborator-avatar is-human"><UserCircle size={16} weight="fill" /></span>
        <p><strong>You</strong><small>Owner · shapes taste, memory, and final approval</small></p>
        <span className="creator-role-state">In control</span>
      </div>
      <div className="creator-collaborator-row">
        <span className="creator-collaborator-avatar is-agent"><Robot size={15} weight="fill" /></span>
        <p><strong>{props.piece.session_agent_label ?? "Codex"}</strong><small>Collaborator · reads context, drafts, revises, and renders</small></p>
        <span className={`creator-role-state ${connected ? "is-connected" : ""}`}>{connected ? "Connected" : available ? "Waiting" : "Available"}</span>
      </div>
      <div className="creator-session-receipt"><span>Session receipt</span><code>{props.piece.session_connection_id?.slice(0, 8) ?? "created when connected"}</code></div>
      <details className="creator-agent-scope">
        <summary>Exact agent scope</summary>
        <div><SquaresFour size={14} /><span>Read the bounded Template receipt</span></div>
        <div><NotePencil size={14} /><span>Revise slides and finish visual files</span></div>
        <div className="is-locked"><LockKey size={14} /><span>Cannot publish on your behalf</span></div>
      </details>
    </div>
  );
}

function PieceCanvas(props: {
  piece: PieceRecord;
  source: InspirationWithCreator | null;
  workspace: Workspace;
  attention: SharedAttentionSelection[];
  onToggleAttention: (selection: SharedAttentionSelection) => void;
  onAddAttention: (selection: SharedAttentionSelection) => void;
}) {
  const slides = (props.piece.carousel ?? []).slice().sort((a, b) => a.index - b.index);
  const [selected, setSelected] = useState(1);
  const [editing, setEditing] = useState(false);
  const slide = slides.find((item) => item.index === selected) ?? slides[0];
  const [title, setTitle] = useState(slide?.title ?? "");
  const [body, setBody] = useState(slide?.body ?? "");
  const [visualCue, setVisualCue] = useState(slide?.visual_cue ?? "");
  useEffect(() => { setTitle(slide?.title ?? ""); setBody(slide?.body ?? ""); setVisualCue(slide?.visual_cue ?? ""); setEditing(false); }, [slide?.index, slide?.title, slide?.body, slide?.visual_cue]);
  const media = pieceMedia(slide);
  const sourceMedia = mediaUrl(props.source);
  if (!slide) return <div className="creator-piece-empty">This piece does not have a carousel story yet.</div>;
  const slideAttention = (item: CarouselSlide): SharedAttentionSelection => ({
    key: `slide:${props.piece.id}:${item.index}`,
    kind: "slide",
    entityId: `${props.piece.id}:${item.index}`,
    parentId: props.piece.id,
    label: `Slide ${item.index}`,
    preview: `${item.title}. ${item.body} Visual: ${item.visual_cue}`,
    role: "change",
    version: props.piece.current_version ?? 1,
  });
  const slideIsAttention = (item: CarouselSlide) => props.attention.some((selection) => selection.key === `slide:${props.piece.id}:${item.index}`);
  const captureText = (element: HTMLElement, field: "title" | "body") => {
    const range = selectedTextRange(element);
    if (!range) return;
    props.onAddAttention({
      key: `text:${props.piece.id}:${slide.index}:${field}:${range.start}-${range.end}`,
      kind: "text",
      entityId: `${props.piece.id}:${slide.index}:${field}`,
      parentId: props.piece.id,
      label: `Slide ${slide.index} · ${field} selection`,
      preview: range.text,
      role: "change",
      version: props.piece.current_version ?? 1,
      range: { field, start: range.start, end: range.end },
    });
    window.getSelection()?.removeAllRanges();
  };
  return (
    <div className="creator-canvas-wrap">
      <div className="creator-slide-rail" aria-label="Carousel slides">
        {slides.map((item) => (
          <button
            key={item.index}
            className={`${item.index === slide.index ? "is-selected" : ""} ${slideIsAttention(item) ? "is-attention" : ""}`}
            title="Open slide. Shift-click to add or remove it from Talking about."
            onClick={(event) => {
              setSelected(item.index);
              if (event.shiftKey || event.metaKey || event.ctrlKey) props.onToggleAttention(slideAttention(item));
            }}
          >
            {pieceMedia(item) ? <img src={pieceMedia(item) ?? ""} alt="" /> : sourceMedia ? <img src={sourceMedia} alt="" /> : <div>{item.index}</div>}
            {slideIsAttention(item) && <span className="creator-slide-attention-mark"><Check size={9} weight="bold" /></span>}
            <span className="creator-slide-index">{String(item.index).padStart(2, "0")}</span>
          </button>
        ))}
      </div>
      <div className="creator-artifact-column">
        <div className="creator-artifact-toolbar">
          <span>Slide {slide.index} of {slides.length}</span>
          <div>
            <button className="creator-icon-button" disabled={slide.index === 1} onClick={() => setSelected(Math.max(1, slide.index - 1))}><ArrowLeft size={17} /></button>
            <button className="creator-icon-button" disabled={slide.index === slides.length} onClick={() => setSelected(Math.min(slides.length, slide.index + 1))}><ArrowRight size={17} /></button>
            <button className={`creator-secondary-button creator-slide-attention ${slideIsAttention(slide) ? "is-active" : ""}`} onClick={() => props.onToggleAttention(slideAttention(slide))}>{slideIsAttention(slide) ? <Check size={15} /> : <SelectionPlus size={15} />} {slideIsAttention(slide) ? "Selected" : "Talk about this"}</button>
            <button className="creator-secondary-button" onClick={() => setEditing((value) => !value)}><NotePencil size={15} /> Edit slide</button>
          </div>
        </div>
        <div className={`creator-artifact ${slide.kind === "cover" && (media || sourceMedia) ? "is-cover" : ""}`}>
          {(media || sourceMedia) && <img src={media ?? sourceMedia ?? ""} alt="" />}
          <div className="creator-artifact-scrim" />
          {!media && sourceMedia && <span className="creator-source-material">Source material · final visual pending</span>}
          <div className="creator-artifact-meta"><span>ARUTLEE / {slide.kind.toUpperCase()}</span><span>{String(slide.index).padStart(2, "0")} / 07</span></div>
          <div className="creator-artifact-copy">
            <span className="creator-artifact-rule" />
            <h2 data-attention-field="title" title="Highlight text to add that exact phrase to Talking about" onMouseUp={(event) => captureText(event.currentTarget, "title")}>{slide.title}</h2>
            <p data-attention-field="body" title="Highlight text to add that exact phrase to Talking about" onMouseUp={(event) => captureText(event.currentTarget, "body")}>{slide.body}</p>
          </div>
          <strong className="creator-artifact-wordmark">ARUTLEE</strong>
        </div>
        {editing && (
          <div className="creator-slide-editor">
            <label>Slide title<textarea value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>Body<textarea value={body} onChange={(event) => setBody(event.target.value)} /></label>
            <label>Visual direction<textarea value={visualCue} onChange={(event) => setVisualCue(event.target.value)} /></label>
            <div><button className="creator-text-button" onClick={() => setEditing(false)}>Cancel</button><button className="creator-small-button" disabled={props.workspace.busy === "slide"} onClick={() => void props.workspace.updateSlide(props.piece, slide.index, { title, body, visual_cue: visualCue })}><Check size={14} /> Save version</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

function PieceView(props: {
  studio: Studio;
  workspace: Workspace;
  webmcp: WebMCPState;
  attention: SharedAttentionSelection[];
  onToggleAttention: (selection: SharedAttentionSelection) => void;
  onAddAttention: (selection: SharedAttentionSelection) => void;
}) {
  const piece = props.studio.selected && isVibeSession(props.studio.selected) ? props.studio.selected : props.studio.pieces.find(isVibeSession) ?? null;
  const [receipt, setReceipt] = useState<ContextReceipt | null>(null);
  useEffect(() => {
    if (!piece?.context_receipt_id) { setReceipt(null); return; }
    fetch(`/api/context-receipts/${piece.context_receipt_id}`).then((response) => response.ok ? response.json() : null).then((data) => setReceipt(data?.record ?? null)).catch(() => setReceipt(null));
  }, [piece?.context_receipt_id]);
  const source = props.workspace.inspirations.find((item) => item.id === piece?.inspiration_id) ?? null;
  const appliedBrain = receipt ? props.workspace.brain.filter((item) => receipt.brain_ids.includes(item.id)) : [];
  if (!piece) {
    return (
      <section className="creator-no-piece">
        <MagicWand size={34} weight="duotone" /><h1>No creator session yet</h1><p>Choose an inspiration and create your first seven-slide Draft.</p>
      </section>
    );
  }
  if (isUnstartedSession(piece)) {
    const connected = piece.session_connection_status === "connected";
    const webmcpReady = props.webmcp === "ready" || props.webmcp === "legacy-preview";
    return (
      <div className="creator-piece-view creator-new-session-view">
        <header className="creator-piece-header">
          <div><span className="creator-eyebrow">New creator Session</span><h1>{piece.title}</h1><p>Your Template is attached. Begin from the Codex conversation you already use.</p></div>
          <span className="creator-piece-status is-draft">Draft</span>
        </header>
        <CollaborationBar piece={piece} activities={props.workspace.activities} busy={props.workspace.busy} webmcp={props.webmcp} onReview={() => void props.workspace.review(piece)} />
        <section className="creator-new-session-empty" aria-labelledby="new-session-ready-title">
          <span className="creator-new-session-icon"><Robot size={28} weight="duotone" /></span>
          <span className="creator-eyebrow">{connected ? "Codex connected" : "Ready for Codex"}</span>
          <h2 id="new-session-ready-title">What should we make?</h2>
          <p>{connected
            ? "Talk to Codex naturally. Its first saved draft will appear in this Session."
            : webmcpReady
              ? "Tell Codex what you want to create. It can connect to this open Session, read the relevant Template receipt, and build here."
              : "Turn on WebMCP in Agent settings, then tell Codex what you want to create in this Session."}</p>
          <div className="creator-new-session-prompt">
            <Robot size={16} weight="fill" />
            <span><small>Say in Codex</small>{connected ? "“Make a carousel about…”" : "“Connect to this VibeStudio Session and make a carousel about…”"}</span>
          </div>
          <div className="creator-new-session-ready-row" aria-label="Session setup">
            <span><CheckCircle size={14} weight="fill" /> Template attached</span>
            <span><CheckCircle size={14} weight="fill" /> History ready</span>
            <span><LockKey size={14} weight="fill" /> You keep approval</span>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="creator-piece-view">
      <header className="creator-piece-header">
        <div><span className="creator-eyebrow">Carousel Session · {piece.session_connection_status === "connected" ? "Codex connected" : "waiting for Codex"}</span><h1>{piece.title}</h1><p>{piece.hook}</p></div>
        <div className="creator-piece-actions">
          <span className={`creator-piece-status is-${humanPieceStatus(piece)}`}>{prettyStatus(piece)}</span>
          <button className="creator-secondary-button" onClick={() => void props.workspace.setPieceStatus(piece, humanPieceStatus(piece) === "ready" ? "draft" : "ready")} disabled={props.workspace.busy === "status"}>{humanPieceStatus(piece) === "ready" ? "Return to Draft" : "Mark Ready"}</button>
          <button className="creator-primary-button" onClick={() => void props.workspace.finish(piece)} disabled={props.workspace.busy === "finish"}><Export size={16} /> {props.workspace.busy === "finish" ? "Finishing…" : "Finish slides"}</button>
        </div>
      </header>
      <CollaborationBar piece={piece} activities={props.workspace.activities} busy={props.workspace.busy} webmcp={props.webmcp} onReview={() => void props.workspace.review(piece)} />
      <div className="creator-piece-content">
        <PieceCanvas piece={piece} source={source} workspace={props.workspace} attention={props.attention} onToggleAttention={props.onToggleAttention} onAddAttention={props.onAddAttention} />
        <aside className="creator-piece-inspector">
          <CollaborationInspector piece={piece} webmcp={props.webmcp} />
          <div className={`creator-inspector-block ${source && props.attention.some((item) => item.key === `inspiration:${source.id}`) ? "is-attention" : ""}`}>
            <div className="creator-section-title"><ImageSquare size={16} /><strong>Source lineage</strong>{source && <button className="creator-icon-button" onClick={() => props.onToggleAttention({ key: `inspiration:${source.id}`, kind: "inspiration", entityId: source.id, label: `Inspiration · ${source.creator?.display_name ?? source.platform}`, preview: `${source.title}. ${source.reaction_note || source.saved_reason || source.caption}`, role: "reference", version: source.version })} aria-label="Add source to shared attention">{props.attention.some((item) => item.key === `inspiration:${source.id}`) ? <Check size={14} /> : <SelectionPlus size={14} />}</button>}</div>
            {source ? <><span>{source.creator?.display_name ?? source.platform}</span><p>{source.title}</p><small>{piece.transformation_note}</small></> : <p>No linked inspiration.</p>}
          </div>
          <div className="creator-inspector-block">
            <div className="creator-section-title"><SquaresFour size={16} /><strong>Template receipt</strong><span>{appliedBrain.length} rules</span></div>
            <p>{receipt?.summary.slice(0, 340) ?? "Loading the exact Template rules used for this Session…"}</p>
            <details><summary>Applied Template rules</summary>{appliedBrain.map((item) => {
              const attentionKey = `memory:${item.id}`;
              const selected = props.attention.some((selection) => selection.key === attentionKey);
              return <button key={item.id} className={`creator-applied-memory ${selected ? "is-attention" : ""}`} onClick={() => props.onToggleAttention({ key: attentionKey, kind: "memory", entityId: item.id, label: `${item.category.replaceAll("_", " ")} template rule`, preview: item.text, role: "preserve", version: item.version })}><span>{item.category.replaceAll("_", " ")} · {selected ? "selected" : "add to context"}</span>{item.text}</button>;
            })}</details>
          </div>
          <ActivityTrail activities={props.workspace.activities} piece={piece} busy={props.workspace.busy} onUndo={(activity) => void props.workspace.undo(activity)} />
        </aside>
      </div>
      <details className="creator-advanced-details">
        <summary>Advanced production controls</summary>
        <div className="creator-legacy-workbench"><PieceScroll studio={props.studio} piece={piece} sources={props.studio.inbox.filter((item) => piece.source_inbox_ids.includes(item.id))} /></div>
      </details>
    </div>
  );
}

export function StudioShell(props: { studio: Studio }) {
  const [view, setView] = useState<ArutleeView>("inspire");
  const [attention, setAttention] = useState<SharedAttentionSelection[]>([]);
  const [guideOpen, setGuideOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pointerButton, setPointerButton] = useState<PointerButtonPreference>("right");
  const [webmcpPreferences, setWebmcpPreferences] = useState<WebMCPPreferences>(() => ({
    ...createDefaultWebMCPPreferences(),
    enabled: false,
  }));
  const [drawing, setDrawing] = useState<SharedAttentionGeometry | null>(null);
  const suppressPointClick = useRef(false);
  const workspace = useCreatorWorkspace(props.studio);
  const toggleAttention = useCallback((selection: SharedAttentionSelection) => {
    setAttention((current) => {
      const exists = current.some((item) => item.key === selection.key);
      if (!exists && current.length >= SHARED_ATTENTION_LIMIT) {
        props.studio.flash(`Talking about can hold up to ${SHARED_ATTENTION_LIMIT} items`, "err");
        return current;
      }
      return toggleSharedAttention(current, selection);
    });
  }, [props.studio.flash]);
  const addAttention = useCallback((selection: SharedAttentionSelection) => {
    setAttention((current) => {
      const exists = current.some((item) => item.key === selection.key);
      if (!exists && current.length >= SHARED_ATTENTION_LIMIT) {
        props.studio.flash(`Talking about can hold up to ${SHARED_ATTENTION_LIMIT} items`, "err");
        return current;
      }
      return addSharedAttention(current, selection);
    });
  }, [props.studio.flash]);
  const webmcp = useArutleeWebMCP({
    view,
    selectedInspirationId: workspace.selectedInspirationId,
    selectedPieceId: props.studio.selected?.id ?? null,
    attentionSelections: attention,
    preferences: webmcpPreferences,
  });
  useEffect(() => {
    setGuideOpen(window.localStorage.getItem("vibestudio.shared-attention-guide-v2") !== "complete");
    const savedPointerButton = window.localStorage.getItem("vibestudio.pointer-button");
    if (savedPointerButton === "left" || savedPointerButton === "right") setPointerButton(savedPointerButton);
    try {
      const savedWebMCPPreferences = window.localStorage.getItem(WEBMCP_PREFERENCES_KEY);
      setWebmcpPreferences(savedWebMCPPreferences
        ? normalizeWebMCPPreferences(JSON.parse(savedWebMCPPreferences))
        : createDefaultWebMCPPreferences());
    } catch {
      window.localStorage.removeItem(WEBMCP_PREFERENCES_KEY);
      setWebmcpPreferences(createDefaultWebMCPPreferences());
    }
  }, []);
  const closeGuide = useCallback(() => {
    window.localStorage.setItem("vibestudio.shared-attention-guide-v2", "complete");
    setGuideOpen(false);
  }, []);
  const updatePointerButton = useCallback((preference: PointerButtonPreference) => {
    window.localStorage.setItem("vibestudio.pointer-button", preference);
    setPointerButton(preference);
    setDrawing(null);
    setAttention((current) => dismissAttentionAnnotations(current));
  }, []);
  const updateWebMCPPreferences = useCallback((preferences: WebMCPPreferences) => {
    const normalized = normalizeWebMCPPreferences(preferences);
    window.localStorage.setItem(WEBMCP_PREFERENCES_KEY, JSON.stringify(normalized));
    setWebmcpPreferences(normalized);
  }, []);
  const beginPointing = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const action = pointerGestureAction(pointerButton, event.button, Boolean(interactivePointerTarget(event.target)));
    if (action === "dismiss") {
      setDrawing(null);
      setAttention((current) => dismissAttentionAnnotations(current));
      if (pointerButton === "left") {
        event.preventDefault();
        event.stopPropagation();
        activateInteractivePointerTarget(event.target);
      }
      return;
    }
    if (action !== "point") return;
    event.preventDefault();
    event.stopPropagation();
    suppressPointClick.current = event.button === 0;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawing({ surface: view, mode: "point", points: [normalizedAttentionPoint(event)] });
  }, [pointerButton, view]);
  const continuePointing = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!drawing || !(event.buttons & pointerButtonsMask(pointerButton))) return;
    event.preventDefault();
    const point = normalizedAttentionPoint(event);
    setDrawing((current) => current ? { ...current, mode: "drawing", points: [...current.points, point].slice(-180) } : null);
  }, [drawing, pointerButton]);
  const finishPointing = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!drawing || pointerGestureAction(pointerButton, event.button) !== "point") return;
    event.preventDefault();
    event.stopPropagation();
    const points = [...drawing.points, normalizedAttentionPoint(event)];
    const mode = drawingDistance(points) > 0.018 ? "drawing" : "point";
    const geometry: SharedAttentionGeometry = { ...drawing, mode, points: mode === "point" ? [points[0]] : points };
    const anchor = geometry.points[Math.floor(geometry.points.length / 2)] ?? geometry.points[0];
    const label = `${mode === "point" ? "Point" : "Drawing"} on ${surfaceLabel(view)}`;
    const entityId = `${view}:${Date.now()}`;
    addAttention({
      key: `annotation:${entityId}`,
      kind: "annotation",
      entityId,
      label,
      preview: `${label} near ${Math.round(anchor.x * 100)}% across and ${Math.round(anchor.y * 100)}% down VibeStudio.`,
      role: view === "inspire" ? "reference" : "change",
      geometry,
    });
    setDrawing(null);
    window.setTimeout(() => { suppressPointClick.current = false; }, 0);
  }, [addAttention, drawing, pointerButton, view]);
  useEffect(() => setDrawing(null), [view]);
  useEffect(() => {
    const listener = (event: Event) => {
      const next = (event as CustomEvent<Record<string, unknown>>).detail?.view;
      if (next === "inspire" || next === "piece" || next === "schedule" || next === "template") setView(next);
    };
    window.addEventListener("arutlee:data-changed", listener);
    return () => window.removeEventListener("arutlee:data-changed", listener);
  }, []);
  return (
    <main
      className={`creator-shell ${attention.length ? "has-attention" : ""}`}
      onPointerDownCapture={beginPointing}
      onPointerMoveCapture={continuePointing}
      onPointerUpCapture={finishPointing}
      onPointerCancelCapture={() => { suppressPointClick.current = false; setDrawing(null); }}
      onClickCapture={(event) => {
        if (!suppressPointClick.current) return;
        suppressPointClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
      onContextMenuCapture={(event) => event.preventDefault()}
    >
      <SessionRail
        view={view}
        setView={setView}
        studio={props.studio}
        webmcp={webmcp}
        pointerButton={pointerButton}
        busy={workspace.busy}
        onNewSession={() => {
          void workspace.createSession().then((piece) => {
            if (piece) setView("piece");
          });
        }}
        onOpenGuide={() => setGuideOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="creator-workspace">
        {view === "inspire" && <InspireView workspace={workspace} attention={attention} onToggleAttention={toggleAttention} onCreate={(source) => { void workspace.createFromInspiration(source).then((piece) => { if (piece) setView("piece"); }); }} />}
        {view === "piece" && <PieceView studio={props.studio} workspace={workspace} webmcp={webmcp} attention={attention} onToggleAttention={toggleAttention} onAddAttention={addAttention} />}
        {view === "schedule" && <ScheduleView studio={props.studio} onOpenSession={(piece) => { props.studio.setSelectedId(piece.id); setView("piece"); }} />}
        {view === "template" && <TemplateStudio attention={attention} onFlash={props.studio.flash} />}
      </div>
      <AttentionInk surface={view} selections={attention} draft={drawing} />
      <AttentionTray
        selections={attention}
        webmcp={webmcp}
        onRole={(key, role) => setAttention((current) => setSharedAttentionRole(current, key, role))}
        onRemove={(key) => setAttention((current) => current.filter((item) => item.key !== key))}
        onClear={() => setAttention([])}
      />
      <SharedAttentionGuide open={guideOpen} view={view} selections={attention} pointerButton={pointerButton} onView={setView} onClose={closeGuide} />
      {settingsOpen && <AgentSettingsDialog preference={pointerButton} onPointerChange={updatePointerButton} webmcpPreferences={webmcpPreferences} onWebMCPChange={updateWebMCPPreferences} onClose={() => setSettingsOpen(false)} />}
      <div className="creator-toast-stack">
        {props.studio.toasts.map((toast) => <div key={toast.id} data-tone={toast.tone}>{toast.text}</div>)}
      </div>
    </main>
  );
}

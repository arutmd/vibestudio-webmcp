"use client";

import {
  ArrowRight,
  CaretDown,
  Check,
  Circle,
  ClockCounterClockwise,
  ImageSquare,
  LockKey,
  MagicWand,
  Minus,
  PencilSimple,
  Plus,
  Sparkle,
  TextT,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SharedAttentionSelection } from "@/lib/sharedAttention";
import { moveTemplatePosition, normalizeTemplatePosition, type TemplateElementPosition } from "@/lib/templatePosition";
import type { TemplateBackgroundComposition, TemplateBackgroundVariability } from "@/lib/templateBackground";

type TemplateSlide = {
  id: 1 | 2 | 3;
  label: "Cover" | "Body" | "Close";
  kicker: string;
  title: string;
  body: string;
};

type TemplateVersion = {
  id: number;
  status: "draft" | "locked" | "history";
  date: string;
  author: "You" | "AI Assistant";
};

type EditableField = "kicker" | "title" | "body" | "author" | "image";
type MovableField = Exclude<EditableField, "image">;
type BackgroundMode = "generative" | "reference" | "fixed";
type PreviewKind = "generated" | "reference" | "fixed";

type SlotProposal = {
  field: EditableField;
  slideId: TemplateSlide["id"];
  instruction: string;
  before: string;
  after: string;
  summary: string;
  provider: "codex" | "codex-image" | "fallback";
  dirtyBefore: boolean;
};

type TemplateSnapshot = {
  slides: TemplateSlide[];
  authorName: string;
  authorRole: string;
  backgroundUrl: string;
  backgroundMode: BackgroundMode;
  backgroundDirection: string;
  backgroundVariability: TemplateBackgroundVariability;
  backgroundComposition: TemplateBackgroundComposition;
  referenceName: string;
  referenceUrl: string;
  previewKind: PreviewKind;
  imageOffset: number;
  positions: Record<number, Partial<Record<MovableField, TemplateElementPosition>>>;
};

type StoredTemplateStudio = TemplateSnapshot & {
  versions: TemplateVersion[];
  selectedVersion: number;
  selectedSlideId: TemplateSlide["id"];
  historySnapshots: Record<number, TemplateSnapshot>;
};

const TEMPLATE_STORAGE_KEY = "vibestudio.template-studio.v3";
const DEFAULT_TEMPLATE_SAMPLE = "/template-studio/generated/template-sample-codex-b93b08ca.png";

const zeroPosition: TemplateElementPosition = { x: 0, y: 0 };

const templateSlides: TemplateSlide[] = [
  {
    id: 1,
    label: "Cover",
    kicker: "Strategy",
    title: "Design systems\nthat scale",
    body: "Practical patterns for building consistent, adaptable, and future-ready products.",
  },
  {
    id: 2,
    label: "Body",
    kicker: "The system",
    title: "Consistency is a creative advantage.",
    body: "A useful template protects the decisions that matter, while leaving the idea itself room to change.\n\nLock the rhythm. Keep the expression alive.",
  },
  {
    id: 3,
    label: "Close",
    kicker: "Build better",
    title: "Build with purpose.\nScale with clarity.",
    body: "The best systems make good decisions easier to repeat.",
  },
];

const initialVersions: TemplateVersion[] = [
  { id: 8, status: "draft", date: "May 11, 2025 10:32 AM", author: "You" },
  { id: 7, status: "locked", date: "May 10, 2025 4:18 PM", author: "You" },
  { id: 6, status: "history", date: "May 9, 2025 2:07 PM", author: "You" },
  { id: 5, status: "history", date: "May 9, 2025 11:41 AM", author: "AI Assistant" },
  { id: 4, status: "history", date: "May 8, 2025 6:22 PM", author: "You" },
  { id: 3, status: "history", date: "May 8, 2025 3:14 PM", author: "AI Assistant" },
  { id: 2, status: "history", date: "May 7, 2025 5:46 PM", author: "You" },
  { id: 1, status: "history", date: "May 6, 2025 9:12 AM", author: "AI Assistant" },
];

const fieldLabels: Record<EditableField, string> = {
  kicker: "Kicker slot",
  title: "Title slot",
  body: "Body slot",
  author: "Author slot",
  image: "Background slot",
};

const backgroundModeLabels: Record<BackgroundMode, string> = {
  generative: "Generative",
  reference: "Reference-guided",
  fixed: "Fixed asset",
};

function VersionCard(props: {
  version: TemplateVersion;
  selected: boolean;
  onSelect: () => void;
}) {
  const { version } = props;
  const highlighted = version.status === "draft" || version.status === "locked";
  return (
    <button
      className={`template-version ${props.selected ? "is-selected" : ""} is-${version.status}`}
      onClick={props.onSelect}
      aria-pressed={props.selected}
    >
      <span className="template-version-dot">
        {version.status === "locked" ? <LockKey size={13} weight="duotone" /> : <Circle size={9} weight={highlighted ? "fill" : "regular"} />}
      </span>
      <span className="template-version-copy">
        <span className="template-version-title"><strong>v{version.id}</strong>{version.status === "draft" && <em>Working version</em>}{version.status === "locked" && <em>Published</em>}</span>
        <small>{version.date}</small>
        <small>{version.author}{version.status === "draft" ? " · Editing" : version.status === "locked" ? " · Published" : ""}</small>
      </span>
    </button>
  );
}

function TemplateCanvas(props: {
  slide: TemplateSlide;
  selectedVersion: number;
  comparisonVersion: number;
  comparing: boolean;
  editable: boolean;
  selectedField: EditableField;
  inlineEditing: EditableField | null;
  authorName: string;
  authorRole: string;
  backgroundUrl: string;
  imageOffset: number;
  positions: Partial<Record<MovableField, TemplateElementPosition>>;
  onSelectField: (field: EditableField, inline?: boolean) => void;
  onPositionChange: (field: MovableField, position: TemplateElementPosition) => void;
  onUpdateSlide: (field: "kicker" | "title" | "body", value: string) => void;
  onUpdateAuthor: (field: "name" | "role", value: string) => void;
  onFinishInlineEdit: () => void;
}) {
  const dragRef = useRef<{
    field: MovableField;
    pointerId: number;
    startX: number;
    startY: number;
    origin: TemplateElementPosition;
  } | null>(null);
  const selectedClass = (field: EditableField) => props.editable && props.selectedField === field ? "is-field-selected" : "";
  const positionFor = (field: MovableField) => props.positions[field] ?? zeroPosition;
  const positionStyle = (field: MovableField) => {
    const position = positionFor(field);
    return { transform: `translate(${position.x}px, ${position.y}px)` };
  };
  const beginMove = (event: React.PointerEvent<HTMLElement>, field: MovableField) => {
    if (!props.editable || event.button !== 0 || props.inlineEditing === field) return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea")) return;
    props.onSelectField(field);
    dragRef.current = {
      field,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: positionFor(field),
    };
  };
  const continueMove = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !(event.buttons & 1)) return;
    const delta = { x: event.clientX - drag.startX, y: event.clientY - drag.startY };
    if (Math.abs(delta.x) + Math.abs(delta.y) < 2) return;
    event.preventDefault();
    props.onPositionChange(drag.field, moveTemplatePosition(drag.origin, delta));
  };
  const finishMove = (event: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
  };
  const onKeySelect = (event: React.KeyboardEvent, field: EditableField) => {
    if (field !== "image" && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      const amount = event.shiftKey ? 10 : 1;
      const delta = {
        x: event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0,
        y: event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0,
      };
      props.onPositionChange(field, moveTemplatePosition(positionFor(field), delta));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      props.onSelectField(field);
    }
  };

  return (
    <article
      className={`template-canvas is-slide-${props.slide.id} ${props.comparing ? "is-comparing" : ""} ${props.editable ? "is-editable" : "is-readonly"}`}
      aria-label={`${props.slide.label} template preview`}
      onPointerMove={continueMove}
      onPointerUp={finishMove}
      onPointerCancel={finishMove}
      onPointerLeave={finishMove}
    >
      <img src={props.backgroundUrl} alt="Template background sample" style={{ transform: `translateY(${props.imageOffset}%)` }} />
      <div className="template-paper-copy">
        <div
          className={`template-editable-kicker ${selectedClass("kicker")}`}
          style={positionStyle("kicker")}
          role="button"
          tabIndex={props.editable ? 0 : -1}
          onPointerDown={(event) => beginMove(event, "kicker")}
          onClick={() => props.editable && props.onSelectField("kicker")}
          onDoubleClick={() => props.editable && props.onSelectField("kicker", true)}
          onKeyDown={(event) => onKeySelect(event, "kicker")}
          aria-label="Edit kicker slot"
        >
          {props.inlineEditing === "kicker" ? (
            <input
              autoFocus
              className="template-inline-kicker"
              value={props.slide.kicker}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => props.onUpdateSlide("kicker", event.target.value)}
              onBlur={props.onFinishInlineEdit}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur(); }}
              aria-label="Kicker text"
            />
          ) : <span className="template-paper-kicker">{props.slide.kicker}</span>}
        </div>
        <span className="template-paper-rule" />
        <div
          className={`template-title-selection ${selectedClass("title")}`}
          style={positionStyle("title")}
          role="button"
          tabIndex={props.editable ? 0 : -1}
          onPointerDown={(event) => beginMove(event, "title")}
          onClick={() => props.editable && props.onSelectField("title")}
          onDoubleClick={() => props.editable && props.onSelectField("title", true)}
          onKeyDown={(event) => onKeySelect(event, "title")}
          aria-label="Edit title slot"
        >
          {props.selectedField === "title" && props.editable && <span className="template-selection-label">Title slot · Drag to place</span>}
          {props.selectedField === "title" && props.editable && <><span className="template-selection-handle is-nw" /><span className="template-selection-handle is-ne" /><span className="template-selection-handle is-sw" /><span className="template-selection-handle is-se" /></>}
          {props.inlineEditing === "title" ? (
            <textarea
              autoFocus
              className="template-inline-title"
              value={props.slide.title}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => props.onUpdateSlide("title", event.target.value)}
              onBlur={props.onFinishInlineEdit}
              onKeyDown={(event) => { if (event.key === "Escape") event.currentTarget.blur(); }}
              aria-label="Title slot sample text"
            />
          ) : <strong>{props.slide.title.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</strong>}
        </div>
        <div
          className={`template-editable-body ${selectedClass("body")}`}
          style={positionStyle("body")}
          role="button"
          tabIndex={props.editable ? 0 : -1}
          onPointerDown={(event) => beginMove(event, "body")}
          onClick={() => props.editable && props.onSelectField("body")}
          onDoubleClick={() => props.editable && props.onSelectField("body", true)}
          onKeyDown={(event) => onKeySelect(event, "body")}
          aria-label="Edit body slot"
        >
          {props.inlineEditing === "body" ? (
            <textarea
              autoFocus
              className="template-inline-body"
              value={props.slide.body}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => props.onUpdateSlide("body", event.target.value)}
              onBlur={props.onFinishInlineEdit}
              onKeyDown={(event) => { if (event.key === "Escape") event.currentTarget.blur(); }}
              aria-label="Body copy text"
            />
          ) : <p>{props.slide.body.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line || <br />}</span>)}</p>}
        </div>
        {props.slide.id === 1 && (
          <div
            className={`template-author ${selectedClass("author")}`}
            style={positionStyle("author")}
            role="button"
            tabIndex={props.editable ? 0 : -1}
            onPointerDown={(event) => beginMove(event, "author")}
            onClick={() => props.editable && props.onSelectField("author")}
            onDoubleClick={() => props.editable && props.onSelectField("author", true)}
            onKeyDown={(event) => onKeySelect(event, "author")}
            aria-label="Edit author slot"
          >
            <img src="/template-studio/lena-park.png" alt={props.authorName} />
            <span>
              {props.inlineEditing === "author" ? (
                <input
                  autoFocus
                  className="template-inline-author"
                  value={props.authorName}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => props.onUpdateAuthor("name", event.target.value)}
                  onBlur={props.onFinishInlineEdit}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur(); }}
                  aria-label="Author name"
                />
              ) : <strong>{props.authorName}</strong>}
              <small>{props.authorRole}</small>
            </span>
          </div>
        )}
      </div>
      {props.editable && (
        <button className={`template-image-edit-button ${selectedClass("image")}`} onClick={() => props.onSelectField("image")}>
          <ImageSquare size={14} /> Background slot
        </button>
      )}
      <span className="template-canvas-version">v{props.selectedVersion}</span>
      {props.comparing && <span className="template-compare-ribbon">Comparing with published v{props.comparisonVersion}</span>}
    </article>
  );
}

function SlideThumb(props: {
  slide: TemplateSlide;
  selected: boolean;
  backgroundUrl: string;
  onSelect: () => void;
}) {
  return (
    <button className={`template-slide-thumb ${props.selected ? "is-selected" : ""} is-slide-${props.slide.id}`} onClick={props.onSelect}>
      <span className="template-slide-mini">
        <img src={props.backgroundUrl} alt="" />
        <strong>{props.slide.title.split("\n").map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</strong>
      </span>
      <span><strong>{props.slide.id}</strong> {props.slide.label}</span>
    </button>
  );
}

export function TemplateStudio(props: {
  attention: SharedAttentionSelection[];
  onFlash: (text: string, tone?: "ok" | "warn" | "err") => void;
}) {
  const [versions, setVersions] = useState(initialVersions);
  const [slides, setSlides] = useState(templateSlides);
  const [selectedVersion, setSelectedVersion] = useState(8);
  const [selectedSlideId, setSelectedSlideId] = useState<TemplateSlide["id"]>(1);
  const [selectedField, setSelectedField] = useState<EditableField>("title");
  const [inlineEditing, setInlineEditing] = useState<EditableField | null>(null);
  const [codexPrompt, setCodexPrompt] = useState("");
  const [slotProposal, setSlotProposal] = useState<SlotProposal | null>(null);
  const [proposalState, setProposalState] = useState<"pending" | "accepted" | null>(null);
  const [comparing, setComparing] = useState(false);
  const [olderVisible, setOlderVisible] = useState(false);
  const [authorName, setAuthorName] = useState("Lena Park");
  const [authorRole, setAuthorRole] = useState("Product Design Lead");
  const [backgroundUrl, setBackgroundUrl] = useState(DEFAULT_TEMPLATE_SAMPLE);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("generative");
  const [backgroundDirection, setBackgroundDirection] = useState("Warm off-white paper, monochrome documentary photography, soft atmospheric depth, restrained coral accents, and quiet negative space.");
  const [backgroundVariability, setBackgroundVariability] = useState<TemplateBackgroundVariability>("balanced");
  const [backgroundComposition, setBackgroundComposition] = useState<TemplateBackgroundComposition>("quiet-top");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceName, setReferenceName] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [previewKind, setPreviewKind] = useState<PreviewKind>("generated");
  const [generatingSample, setGeneratingSample] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [imageOffset, setImageOffset] = useState(10);
  const [positions, setPositions] = useState<Record<number, Partial<Record<MovableField, TemplateElementPosition>>>>({});
  const [historySnapshots, setHistorySnapshots] = useState<Record<number, TemplateSnapshot>>({});
  const [hydrated, setHydrated] = useState(false);
  const [saveRevision, setSaveRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const selected = versions.find((version) => version.id === selectedVersion) ?? versions[0];
  const draftVersion = versions.find((version) => version.status === "draft")?.id ?? versions[0].id;
  const publishedVersion = versions.find((version) => version.status === "locked")?.id ?? 7;
  const editable = selected.status === "draft";
  const liveSnapshot = useMemo<TemplateSnapshot>(() => ({
    slides,
    authorName,
    authorRole,
    backgroundUrl,
    backgroundMode,
    backgroundDirection,
    backgroundVariability,
    backgroundComposition,
    referenceName,
    referenceUrl,
    previewKind,
    imageOffset,
    positions,
  }), [slides, authorName, authorRole, backgroundUrl, backgroundMode, backgroundDirection, backgroundVariability, backgroundComposition, referenceName, referenceUrl, previewKind, imageOffset, positions]);
  const displayedSnapshot = editable ? liveSnapshot : historySnapshots[selectedVersion] ?? liveSnapshot;
  const selectedSlide = useMemo(
    () => displayedSnapshot.slides.find((slide) => slide.id === selectedSlideId) ?? displayedSnapshot.slides[0],
    [displayedSnapshot, selectedSlideId],
  );
  const selectedPosition = selectedField === "image"
    ? zeroPosition
    : displayedSnapshot.positions[selectedSlideId]?.[selectedField] ?? zeroPosition;
  const proposalIsVisible = proposalState === "pending" && slotProposal?.slideId === selectedSlideId;
  const canvasSlide = useMemo(() => {
    if (!proposalIsVisible || !slotProposal || slotProposal.field === "image" || slotProposal.field === "author") return selectedSlide;
    return { ...selectedSlide, [slotProposal.field]: slotProposal.after };
  }, [proposalIsVisible, selectedSlide, slotProposal]);
  const proposalAuthor = proposalIsVisible && slotProposal?.field === "author"
    ? slotProposal.after.split("|").map((value) => value.trim())
    : null;
  const canvasAuthorName = proposalAuthor?.[0] || displayedSnapshot.authorName;
  const canvasAuthorRole = proposalAuthor?.[1] || displayedSnapshot.authorRole;
  const canvasBackgroundUrl = proposalIsVisible && slotProposal?.field === "image"
    ? slotProposal.after
    : displayedSnapshot.backgroundUrl;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<StoredTemplateStudio>;
      if (Array.isArray(stored.versions) && stored.versions.length) setVersions(stored.versions);
      if (Array.isArray(stored.slides) && stored.slides.length === 3) setSlides(stored.slides);
      if (typeof stored.selectedVersion === "number") setSelectedVersion(stored.selectedVersion);
      if ([1, 2, 3].includes(stored.selectedSlideId as number)) setSelectedSlideId(stored.selectedSlideId as TemplateSlide["id"]);
      if (typeof stored.authorName === "string") setAuthorName(stored.authorName);
      if (typeof stored.authorRole === "string") setAuthorRole(stored.authorRole);
      if (typeof stored.backgroundUrl === "string" && stored.backgroundUrl.startsWith("/template-studio/")) setBackgroundUrl(stored.backgroundUrl);
      if (["generative", "reference", "fixed"].includes(stored.backgroundMode || "")) setBackgroundMode(stored.backgroundMode as BackgroundMode);
      if (typeof stored.backgroundDirection === "string") setBackgroundDirection(stored.backgroundDirection);
      if (["locked", "balanced", "exploratory"].includes(stored.backgroundVariability || "")) setBackgroundVariability(stored.backgroundVariability as TemplateBackgroundVariability);
      if (["quiet-top", "text-left", "centered"].includes(stored.backgroundComposition || "")) setBackgroundComposition(stored.backgroundComposition as TemplateBackgroundComposition);
      if (typeof stored.referenceName === "string") setReferenceName(stored.referenceName);
      if (typeof stored.referenceUrl === "string") setReferenceUrl(stored.referenceUrl);
      if (["generated", "reference", "fixed"].includes(stored.previewKind || "")) setPreviewKind(stored.previewKind as PreviewKind);
      if (typeof stored.imageOffset === "number") setImageOffset(stored.imageOffset);
      if (stored.positions && typeof stored.positions === "object") setPositions(stored.positions);
      if (stored.historySnapshots && typeof stored.historySnapshots === "object") setHistorySnapshots(stored.historySnapshots);
      setDirty(false);
    } catch {
      window.localStorage.removeItem(TEMPLATE_STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || saveRevision === 0) return;
    const stored: StoredTemplateStudio = {
      ...liveSnapshot,
      versions,
      selectedVersion,
      selectedSlideId,
      historySnapshots,
    };
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(stored));
  }, [hydrated, saveRevision]);

  useEffect(() => {
    if (!hydrated || !editable || !dirty) return;
    const timer = window.setTimeout(() => {
      setVersions((current) => current.map((version) => version.id === selectedVersion
        ? { ...version, date: "Just now", author: "You" }
        : version));
      setDirty(false);
      setSaveRevision((current) => current + 1);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [dirty, editable, hydrated, liveSnapshot, selectedVersion]);

  const updateSlide = (field: "kicker" | "title" | "body", value: string) => {
    if (!editable) return;
    setSlides((current) => current.map((slide) => slide.id === selectedSlideId ? { ...slide, [field]: value } : slide));
    setDirty(true);
  };

  const updateAuthor = (field: "name" | "role", value: string) => {
    if (!editable) return;
    if (field === "name") setAuthorName(value);
    else setAuthorRole(value);
    setDirty(true);
  };

  const updatePosition = (field: MovableField, position: TemplateElementPosition) => {
    if (!editable) return;
    const next = normalizeTemplatePosition(position);
    setPositions((current) => ({
      ...current,
      [selectedSlideId]: {
        ...current[selectedSlideId],
        [field]: next,
      },
    }));
    setDirty(true);
  };

  const updateSelectedPosition = (position: TemplateElementPosition) => {
    if (selectedField === "image") return;
    updatePosition(selectedField, position);
  };

  const selectField = (field: EditableField, inline = false) => {
    if (!editable) return;
    if (field !== selectedField) {
      setSlotProposal(null);
      setProposalState(null);
      setCodexPrompt("");
    }
    setSelectedField(field);
    setInlineEditing(inline ? field : null);
  };

  const currentFieldValue = () => {
    if (selectedField === "kicker") return selectedSlide.kicker;
    if (selectedField === "title") return selectedSlide.title;
    if (selectedField === "body") return selectedSlide.body;
    if (selectedField === "author") return `${authorName} | ${authorRole}`;
    return backgroundUrl;
  };

  const applySlotValue = (field: EditableField, slideId: TemplateSlide["id"], value: string, markDirty = true) => {
    if (field === "image") {
      setBackgroundUrl(value);
      setPreviewKind("generated");
      setImageOffset(0);
    } else if (field === "author") {
      const [name, role] = value.split("|").map((part) => part.trim());
      if (name) setAuthorName(name);
      if (role) setAuthorRole(role);
    } else {
      setSlides((current) => current.map((slide) => slide.id === slideId ? { ...slide, [field]: value } : slide));
    }
    if (markDirty) setDirty(true);
  };

  const acceptSlotProposal = () => {
    if (!editable || !slotProposal || proposalState !== "pending") return;
    applySlotValue(slotProposal.field, slotProposal.slideId, slotProposal.after);
    setProposalState("accepted");
    props.onFlash(`${fieldLabels[slotProposal.field]} sample accepted in Working v${selectedVersion}`);
  };

  const undoSlotProposal = () => {
    if (!editable || !slotProposal || proposalState !== "accepted") return;
    applySlotValue(slotProposal.field, slotProposal.slideId, slotProposal.before, false);
    setDirty(slotProposal.dirtyBefore);
    setProposalState(null);
    setSlotProposal(null);
    props.onFlash("Last Codex change undone", "warn");
  };

  const editLatestDraft = () => {
    setSelectedVersion(draftVersion);
    setComparing(false);
    setInlineEditing(null);
    setSlotProposal(null);
    setProposalState(null);
    props.onFlash(`Editing Working v${draftVersion}`);
  };

  const publishTemplate = () => {
    if (!editable) return;
    const nextDraft = selectedVersion + 1;
    setHistorySnapshots((current) => ({ ...current, [selectedVersion]: liveSnapshot }));
    setVersions((current) => [
      { id: nextDraft, status: "draft", date: "Just now", author: "You" },
      ...current.map((version): TemplateVersion => {
        if (version.id === selectedVersion) return { ...version, status: "locked", date: "Just now" };
        if (version.status === "locked") return { ...version, status: "history" };
        return version;
      }),
    ]);
    setSelectedVersion(nextDraft);
    setDirty(false);
    setComparing(false);
    setInlineEditing(null);
    setSaveRevision((current) => current + 1);
    props.onFlash(`Template v${selectedVersion} published. Working version v${nextDraft} is ready.`);
  };

  const useBackgroundFile = async (file: File | undefined, mode: "reference" | "fixed") => {
    if (!file || !editable) return;
    setGenerationError("");
    try {
      const form = new FormData();
      form.set("asset", file);
      const response = await fetch("/api/ai/template-asset", { method: "POST", body: form });
      const result = await response.json() as { path?: string; name?: string; error?: string };
      if (!response.ok || !result.path) throw new Error(result.error || "Could not add this image.");
      setBackgroundUrl(result.path);
      setReferenceFile(mode === "reference" ? file : null);
      setReferenceName(result.name || file.name);
      setReferenceUrl(result.path);
      setPreviewKind(mode);
      setSelectedField("image");
      setDirty(true);
      props.onFlash(mode === "reference"
        ? `${file.name} added as visual guidance`
        : `${file.name} will be reused exactly in this template`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add this image.";
      setGenerationError(message);
      props.onFlash(message, "err");
    }
  };

  const changeBackgroundMode = (mode: BackgroundMode) => {
    if (!editable) return;
    setBackgroundMode(mode);
    setGenerationError("");
    if (mode === "generative") {
      setReferenceFile(null);
      setReferenceName("");
      setReferenceUrl("");
      setPreviewKind("generated");
    } else if (mode === "fixed") {
      setPreviewKind("fixed");
    }
    setDirty(true);
  };

  const requestSlotProposal = async (requestedInstruction?: string) => {
    if (!editable) return;
    const instruction = requestedInstruction?.trim() || codexPrompt.trim() || `Generate another ${fieldLabels[selectedField].toLowerCase()} sample while keeping the same template rules.`;
    if (selectedField === "image" && backgroundMode === "fixed") {
      setGenerationError("This is a fixed asset. Open Edit rules to switch it to a generative background.");
      return;
    }
    if (selectedField === "image" && !backgroundDirection.trim()) {
      setGenerationError("Add a generation direction in Edit rules first.");
      return;
    }
    if (selectedField === "image" && backgroundMode === "reference" && !referenceFile && !referenceUrl) {
      setGenerationError("Add a reference image in Edit rules first.");
      return;
    }

    setGeneratingSample(true);
    setGenerationError("");
    setProposalState(null);
    try {
      const before = currentFieldValue();
      if (selectedField === "image") {
        const form = new FormData();
        form.set("direction", `${backgroundDirection}\n\nSample variation requested by the creator: ${instruction}`);
        form.set("variability", backgroundVariability);
        form.set("composition", backgroundComposition);
        form.set("sampleHeadline", selectedSlide.title.replaceAll("\n", " "));
        if (backgroundMode === "reference" && referenceFile) form.set("reference", referenceFile);
        else if (backgroundMode === "reference" && referenceUrl) form.set("referenceUrl", referenceUrl);
        const response = await fetch("/api/ai/template-background", { method: "POST", body: form });
        const result = await response.json() as { path?: string; error?: string };
        if (!response.ok || !result.path) throw new Error(result.error || "Could not generate a sample.");
        setSlotProposal({
          field: selectedField,
          slideId: selectedSlideId,
          instruction,
          before,
          after: `${result.path}?v=${Date.now()}`,
          summary: "Generated a new visual sample without changing the reusable background rules.",
          provider: "codex-image",
          dirtyBefore: dirty,
        });
      } else {
        const response = await fetch("/api/ai/template-slot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field: selectedField,
            current: before,
            instruction,
            slideLabel: `${selectedSlide.label} · Carousel 4:5`,
            context: props.attention.map((item) => ({ label: item.label, preview: item.preview, role: item.role })),
          }),
        });
        const result = await response.json() as {
          proposal?: { sample?: string; summary?: string };
          provider?: "codex" | "fallback";
          error?: string;
        };
        if (!response.ok || !result.proposal?.sample) throw new Error(result.error || "Codex could not prepare a proposal.");
        setSlotProposal({
          field: selectedField,
          slideId: selectedSlideId,
          instruction,
          before,
          after: result.proposal.sample,
          summary: result.proposal.summary || `Generated another ${fieldLabels[selectedField].toLowerCase()} sample.`,
          provider: result.provider === "fallback" ? "fallback" : "codex",
          dirtyBefore: dirty,
        });
      }
      setProposalState("pending");
      setCodexPrompt(instruction);
      props.onFlash(`Codex prepared a ${fieldLabels[selectedField].toLowerCase()} proposal. Review it before accepting.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not prepare a proposal.";
      setGenerationError(message);
      props.onFlash(message, "err");
    } finally {
      setGeneratingSample(false);
    }
  };

  return (
    <section className="template-studio-page">
      <header className="template-studio-header">
        <div>
          <h1>Template Studio</h1>
          <p>Define the reusable visual system. Sessions bring the content.</p>
        </div>
        <div className="template-studio-actions">
          {editable && <span className="template-autosave-status" data-state={dirty ? "saving" : "saved"}><span />{dirty ? "Saving changes…" : "All changes saved"}</span>}
          <button className={`creator-secondary-button ${comparing ? "is-active" : ""}`} onClick={() => { setComparing((value) => !value); setSelectedVersion(draftVersion); }}>
            <ClockCounterClockwise size={16} /> {comparing ? "Stop comparing" : `Compare with v${publishedVersion}`}
          </button>
          <button className="creator-primary-button" onClick={editable ? publishTemplate : editLatestDraft}>
            {editable ? <LockKey size={16} /> : <PencilSimple size={16} />}
            {editable ? "Publish Template" : `Edit Working v${draftVersion}`}
          </button>
        </div>
      </header>

      <div className="template-studio-grid">
        <aside className="template-history-panel">
          <button className="template-format-button">Carousel · 4:5 <CaretDown size={13} /></button>
          <div className="template-version-list">
            {versions.filter((version) => olderVisible || version.id >= 3).map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                selected={version.id === selectedVersion}
                onSelect={() => { setSelectedVersion(version.id); setComparing(false); setInlineEditing(null); setSlotProposal(null); setProposalState(null); }}
              />
            ))}
          </div>
          <button className="template-older-button" onClick={() => setOlderVisible((value) => !value)}>
            {olderVisible ? "Hide older versions" : "Show older versions"} <CaretDown size={13} className={olderVisible ? "is-open" : ""} />
          </button>
        </aside>

        <div className="template-canvas-stage">
          <div className="template-preview-context">
            <span><Sparkle size={13} weight="duotone" /> Sample preview</span>
            <small>{displayedSnapshot.previewKind === "fixed" ? "This asset will repeat exactly" : displayedSnapshot.previewKind === "reference" ? "Reference only — generate a sample to test the system" : "Not reused — every Session generates its own visual"}</small>
          </div>
          <TemplateCanvas
            slide={canvasSlide}
            selectedVersion={selectedVersion}
            comparisonVersion={publishedVersion}
            comparing={comparing}
            editable={editable}
            selectedField={selectedField}
            inlineEditing={inlineEditing}
            authorName={canvasAuthorName}
            authorRole={canvasAuthorRole}
            backgroundUrl={canvasBackgroundUrl}
            imageOffset={displayedSnapshot.imageOffset}
            positions={displayedSnapshot.positions[selectedSlideId] ?? {}}
            onSelectField={selectField}
            onPositionChange={updatePosition}
            onUpdateSlide={updateSlide}
            onUpdateAuthor={updateAuthor}
            onFinishInlineEdit={() => setInlineEditing(null)}
          />
          {editable ? (
            <p className="template-canvas-hint">Place the slots using sample content · Double-click to change the sample · Sessions replace it</p>
          ) : (
            <div className="template-canvas-readonly" role="status">
              <span>Viewing v{selectedVersion} · Read-only history</span>
              <button onClick={editLatestDraft}>Edit Working v{draftVersion} <ArrowRight size={12} /></button>
            </div>
          )}
          <div className="template-slide-strip" aria-label="Template slides">
            {displayedSnapshot.slides.map((slide) => (
              <SlideThumb key={slide.id} slide={slide} selected={slide.id === selectedSlideId} backgroundUrl={displayedSnapshot.backgroundUrl} onSelect={() => { setSelectedSlideId(slide.id); setInlineEditing(null); setSlotProposal(null); setProposalState(null); setCodexPrompt(""); }} />
            ))}
          </div>
        </div>

        <aside className="template-proposal-panel">
          {editable ? (
            <div className="template-slot-inspector">
              <div className="template-slot-focus">
                <span className="template-slot-icon">{selectedField === "image" ? <ImageSquare size={17} /> : <TextT size={17} />}</span>
                <div>
                  <span>Selected target</span>
                  <h2>{fieldLabels[selectedField]}</h2>
                  <p>{selectedSlide.label} · Working v{selectedVersion}</p>
                </div>
              </div>

              <div className="template-codex-composer">
                <label htmlFor="template-codex-prompt">Ask Codex to change this</label>
                <textarea
                  id="template-codex-prompt"
                  value={codexPrompt}
                  onChange={(event) => setCodexPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      void requestSlotProposal();
                    }
                  }}
                  placeholder={selectedField === "image" ? "e.g. quieter, more negative space" : "e.g. make this shorter and more direct"}
                  aria-label={`Ask Codex about ${fieldLabels[selectedField]}`}
                />
                <div className="template-codex-context">
                  <span><Sparkle size={12} /> {fieldLabels[selectedField]}</span>
                  {props.attention.length > 0 && <span>+ {props.attention.length} shared reference{props.attention.length === 1 ? "" : "s"}</span>}
                </div>
                <div className="template-codex-actions">
                  <button
                    type="button"
                    className="creator-secondary-button"
                    disabled={generatingSample || (selectedField === "image" && backgroundMode === "fixed")}
                    onClick={() => void requestSlotProposal(`Generate another ${fieldLabels[selectedField].toLowerCase()} sample while keeping the same template rules.`)}
                  >
                    <MagicWand size={15} /> {selectedField === "image" ? "Generate sample" : "Regenerate sample"}
                  </button>
                  <button
                    type="button"
                    className="creator-primary-button"
                    disabled={generatingSample || !codexPrompt.trim()}
                    onClick={() => void requestSlotProposal()}
                  >
                    {generatingSample ? "Codex is working…" : "Ask Codex"} <ArrowRight size={14} />
                  </button>
                </div>
                <small>Right-click or draw only when Codex needs spatial or multi-area context.</small>
                {generationError && <p className="template-generation-error" role="alert">{generationError}</p>}
              </div>

              {slotProposal && proposalState && (
                <div className={`template-slot-proposal is-${proposalState}`} aria-live="polite">
                  <div className="template-slot-proposal-head">
                    <div><span>{proposalState === "pending" ? "Codex proposal" : "Applied to working version"}</span><strong>{slotProposal.summary}</strong></div>
                    <em>{slotProposal.provider === "fallback" ? "Fallback" : "Codex"}</em>
                  </div>
                  {proposalState === "pending" && (
                    <div className={`template-slot-diff ${slotProposal.field === "image" ? "is-image" : ""}`}>
                      <div><span>Current</span>{slotProposal.field === "image" ? <img src={slotProposal.before} alt="Current background sample" /> : <p>{slotProposal.before}</p>}</div>
                      <ArrowRight size={15} />
                      <div><span>Proposed</span>{slotProposal.field === "image" ? <img src={slotProposal.after} alt="Proposed background sample" /> : <p>{slotProposal.after}</p>}</div>
                    </div>
                  )}
                  <div className="template-slot-proposal-actions">
                    {proposalState === "pending" ? (
                      <>
                        <button className="creator-secondary-button" onClick={() => { setSlotProposal(null); setProposalState(null); }}><X size={14} /> Dismiss</button>
                        <button className="creator-secondary-button" disabled={generatingSample} onClick={() => void requestSlotProposal(slotProposal.instruction)}><ClockCounterClockwise size={14} /> Try again</button>
                        <button className="creator-primary-button" onClick={acceptSlotProposal}><Check size={14} /> Accept</button>
                      </>
                    ) : (
                      <button className="creator-secondary-button" onClick={undoSlotProposal}><ClockCounterClockwise size={14} /> Undo</button>
                    )}
                  </div>
                </div>
              )}

              <details className="template-advanced-rules">
                <summary><span><PencilSimple size={14} /> Edit rules</span><small>Manual content, position, and generation controls</small><CaretDown size={13} /></summary>
                <div className="template-edit-panel">
                  <div className="template-property-editor">
                    <span className="template-property-label">{fieldLabels[selectedField]} {selectedField !== "image" && <em>Sample content</em>}</span>
                    {selectedField === "kicker" && <input value={selectedSlide.kicker} onChange={(event) => updateSlide("kicker", event.target.value)} aria-label="Edit kicker" />}
                    {selectedField === "title" && <textarea value={selectedSlide.title} onChange={(event) => updateSlide("title", event.target.value)} aria-label="Edit title slot sample" />}
                    {selectedField === "body" && <textarea value={selectedSlide.body} onChange={(event) => updateSlide("body", event.target.value)} aria-label="Edit body copy" />}
                    {selectedField === "author" && (
                      <div className="template-author-fields">
                        <label><span>Name</span><input aria-label="Edit author name" value={authorName} onChange={(event) => updateAuthor("name", event.target.value)} /></label>
                        <label><span>Role</span><input aria-label="Edit author role" value={authorRole} onChange={(event) => updateAuthor("role", event.target.value)} /></label>
                      </div>
                    )}
                    {selectedField === "image" && (
                      <div className="template-image-fields">
                        <div>
                          <span className="template-background-section-label">Source behavior</span>
                          <div className="template-background-modes" role="radiogroup" aria-label="Background behavior">
                            {(Object.keys(backgroundModeLabels) as BackgroundMode[]).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                role="radio"
                                aria-checked={backgroundMode === mode}
                                className={backgroundMode === mode ? "is-active" : ""}
                                onClick={() => changeBackgroundMode(mode)}
                              >
                                {backgroundModeLabels[mode]}
                              </button>
                            ))}
                          </div>
                          <small className="template-background-mode-help">
                            {backgroundMode === "generative" && "The agent creates a new background for every Session using this art direction."}
                            {backgroundMode === "reference" && "A reference teaches the visual language; each Session still receives an original background."}
                            {backgroundMode === "fixed" && "Use one exact asset every time. Best for frames, textures, or non-changing brand artwork."}
                          </small>
                        </div>

                        {backgroundMode !== "fixed" && (
                          <>
                            <label className="template-background-direction">
                              <span>Generation direction</span>
                              <textarea
                                value={backgroundDirection}
                                onChange={(event) => { setBackgroundDirection(event.target.value); setDirty(true); }}
                                aria-label="Background generation direction"
                              />
                            </label>

                            {backgroundMode === "reference" && (
                              <label className={`template-image-upload ${referenceName ? "has-file" : ""}`}>
                                <ImageSquare size={16} />
                                <span>{referenceName || "Add visual reference"}</span>
                                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => useBackgroundFile(event.target.files?.[0], "reference")} />
                              </label>
                            )}

                            <div>
                              <span className="template-background-section-label">Variation between Sessions</span>
                              <div className="template-variation-control" role="radiogroup" aria-label="Generation variability">
                                {(["locked", "balanced", "exploratory"] as TemplateBackgroundVariability[]).map((value) => (
                                  <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={backgroundVariability === value}
                                    className={backgroundVariability === value ? "is-active" : ""}
                                    onClick={() => { setBackgroundVariability(value); setDirty(true); }}
                                  >
                                    {value === "locked" ? "Tight" : value === "balanced" ? "Balanced" : "Wide"}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <label className="template-background-composition">
                              <span>Composition rule</span>
                              <select
                                value={backgroundComposition}
                                onChange={(event) => { setBackgroundComposition(event.target.value as TemplateBackgroundComposition); setDirty(true); }}
                                aria-label="Background composition rule"
                              >
                                <option value="quiet-top">Quiet top · visual weight lower right</option>
                                <option value="text-left">Text-safe left · subject on right</option>
                                <option value="centered">Centered focus · flexible overlays</option>
                              </select>
                            </label>

                          </>
                        )}

                        {backgroundMode === "fixed" && (
                          <label className={`template-image-upload ${referenceName ? "has-file" : ""}`}>
                            <ImageSquare size={16} />
                            <span>{referenceName || "Choose fixed asset"}</span>
                            <input type="file" accept="image/*" onChange={(event) => useBackgroundFile(event.target.files?.[0], "fixed")} />
                          </label>
                        )}

                        <label>
                          <span>Sample crop <strong>{imageOffset}%</strong></span>
                          <div className="template-crop-control">
                            <button aria-label="Move image up" onClick={() => { setImageOffset((value) => Math.max(-12, value - 1)); setDirty(true); }}><Minus size={12} /></button>
                            <input aria-label="Vertical image crop" type="range" min="-12" max="18" value={imageOffset} onChange={(event) => { setImageOffset(Number(event.target.value)); setDirty(true); }} />
                            <button aria-label="Move image down" onClick={() => { setImageOffset((value) => Math.min(18, value + 1)); setDirty(true); }}><Plus size={12} /></button>
                          </div>
                        </label>
                      </div>
                    )}
                    {selectedField !== "image" && (
                      <div className="template-position-editor">
                        <div className="template-position-heading">
                          <span>Position</span>
                          <button
                            disabled={selectedPosition.x === 0 && selectedPosition.y === 0}
                            onClick={() => updateSelectedPosition(zeroPosition)}
                          >
                            <ClockCounterClockwise size={12} /> Reset
                          </button>
                        </div>
                        <div className="template-position-coordinates">
                          <label>
                            <span>X</span>
                            <input
                              type="number"
                              aria-label="Horizontal position"
                              value={selectedPosition.x}
                              onChange={(event) => updateSelectedPosition({ ...selectedPosition, x: Number(event.target.value) })}
                            />
                          </label>
                          <label>
                            <span>Y</span>
                            <input
                              type="number"
                              aria-label="Vertical position"
                              value={selectedPosition.y}
                              onChange={(event) => updateSelectedPosition({ ...selectedPosition, y: Number(event.target.value) })}
                            />
                          </label>
                        </div>
                        <small>Drag the selected block on canvas. Arrow keys nudge by 1 px; hold Shift for 10 px.</small>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <div className="template-locked-summary">
              <LockKey size={24} weight="duotone" />
              <h2>{selected.status === "locked" ? "Published" : "History"} v{selectedVersion}</h2>
              <p>This version is immutable so every Session made from it remains reproducible.</p>
              <button className="creator-primary-button" onClick={editLatestDraft}><PencilSimple size={15} /> Edit Working v{draftVersion}</button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

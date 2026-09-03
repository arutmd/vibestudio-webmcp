"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CarouselSlide,
  CheckResult,
  InboxRecord,
  PieceFormat,
  PieceRecord,
  PlatformId,
} from "./types";

export type Toast = { id: number; text: string; tone: "ok" | "warn" | "err" };
export type AutopilotState = { running: boolean; stage: string | null; error: string | null };
export type CarouselState = {
  running: boolean;
  stage: "story" | "images" | "render" | null;
  completed: number;
  total: number;
  error: string | null;
};

// One check block as returned by /api/ai/firewall. The route emits verdicts in
// the "pass" | "near_miss" | "fail" set, which is a subset of CheckResult, so
// they assign onto piece check fields without casting.
type CheckBlock = { verdict: "pass" | "near_miss" | "fail"; reasons: string[] };

export type FirewallReport = {
  slop: CheckBlock;
  firewall: CheckBlock;
  voice: CheckBlock;
  quick_test: CheckBlock | { verdict: CheckResult; reasons: string[] };
  overall: "pass" | "near_miss" | "fail";
  fix_suggestions: string[];
  fallback?: boolean;
};

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `${res.status} ${url}`);
  return data as T;
}

export function useStudio() {
  const [inbox, setInbox] = useState<InboxRecord[]>([]);
  const [pieces, setPieces] = useState<PieceRecord[]>([]);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [autopilot, setAutopilot] = useState<AutopilotState>({ running: false, stage: null, error: null });
  const [carouselState, setCarouselState] = useState<CarouselState>({
    running: false,
    stage: null,
    completed: 0,
    total: 0,
    error: null,
  });
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const toastId = useRef(0);

  const flash = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const refreshAll = useCallback(async () => {
    const [i, p, s] = await Promise.all([
      jfetch<{ records: InboxRecord[] }>("/api/inbox"),
      jfetch<{ records: PieceRecord[] }>("/api/pieces"),
      jfetch<Record<string, unknown>>("/api/status"),
    ]);
    setInbox(i.records);
    setPieces(p.records);
    setStatus(s);
    setLoaded(true);
    return p.records;
  }, []);

  useEffect(() => {
    refreshAll()
      .then((p) => {
        const last = [...p].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))[0];
        setSelectedId((cur) => cur ?? last?.id ?? null);
      })
      .catch((e) => flash(e instanceof Error ? e.message : String(e), "err"));
  }, [refreshAll, flash]);

  const selected = pieces.find((p) => p.id === selectedId) ?? null;

  const withBusy = useCallback(
    async <T,>(key: string, fn: () => Promise<T>): Promise<T | null> => {
      setBusy((b) => ({ ...b, [key]: true }));
      try { return await fn(); }
      catch (e) { flash(e instanceof Error ? e.message : String(e), "err"); return null; }
      finally { setBusy((b) => ({ ...b, [key]: false })); }
    },
    [flash],
  );

  const savePiece = useCallback(async (id: string, patch: Partial<PieceRecord>) => {
    const { record } = await jfetch<{ record: PieceRecord }>(`/api/pieces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setPieces((ps) => ps.map((p) => (p.id === id ? record : p)));
    return record;
  }, []);

  const turnIntoPiece = useCallback(
    (rec: InboxRecord) =>
      withBusy(`promote:${rec.id}`, async () => {
        // POST /api/pieces accepts title, format, source_inbox_ids, status (plus
        // hook/platforms/etc.). initial_format may be "unknown", which is not a
        // valid PieceFormat, so fall back to field_note in that case.
        const format: PieceFormat =
          rec.initial_format === "unknown" ? "field_note" : rec.initial_format;
        const { record } = await jfetch<{ record: PieceRecord }>("/api/pieces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: rec.ingredients?.source_title ?? rec.raw.slice(0, 80),
            format,
            source_inbox_ids: [rec.id],
            status: "idea",
          }),
        });
        // /api/inbox/[id] exposes only GET and DELETE, no PATCH, so there is no
        // way to mark the source as "triaged" from here. The status flip is
        // dropped intentionally rather than firing a call that always 404s.
        await refreshAll();
        setSelectedId(record.id);
        flash(`Piece created: ${record.id}`);
        return record;
      }),
    [withBusy, refreshAll, flash],
  );

  const runAutopilot = useCallback(async (id: string) => {
    setAutopilot({ running: true, stage: "source", error: null });
    // /api/engine/run patches engine_stage as it advances; poll the piece to
    // surface the live stage while the POST is in flight.
    const poll = setInterval(async () => {
      try {
        const { record } = await jfetch<{ record: PieceRecord }>(`/api/pieces/${id}`);
        setAutopilot((a) => (a.running ? { ...a, stage: record.engine_stage ?? a.stage } : a));
        setPieces((ps) => ps.map((p) => (p.id === id ? record : p)));
      } catch { /* best effort */ }
    }, 2000);
    try {
      // Returns { record, engine }; we refresh from disk afterwards anyway.
      await jfetch(`/api/engine/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pieceId: id }),
      });
      setAutopilot({ running: false, stage: "ready", error: null });
      flash("Autopilot finished");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "engine failed";
      setAutopilot({ running: false, stage: "error", error: msg });
      flash(msg, "err");
    } finally {
      clearInterval(poll);
      await refreshAll();
    }
  }, [refreshAll, flash]);

  const runDraft = useCallback(
    (p: PieceRecord) =>
      withBusy("draft", async () => {
        // /api/ai/draft requires format + title; returns { draft, fallback? }.
        const data = await jfetch<{ draft: string; fallback?: boolean }>("/api/ai/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format: p.format, title: p.title, hook: p.hook }),
        });
        await savePiece(p.id, { body: data.draft });
        flash(data.fallback ? "Draft from template; no AI engine configured" : "Draft updated", data.fallback ? "warn" : "ok");
      }),
    [withBusy, savePiece, flash],
  );

  const buildCarousel = useCallback(
    (p: PieceRecord, slideCount = 8) =>
      withBusy("carousel:story", async () => {
        setCarouselState({ running: true, stage: "story", completed: 0, total: 1, error: null });
        try {
          const data = await jfetch<{ slides: CarouselSlide[]; fallback?: boolean }>(
            "/api/ai/carousel",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                body: p.body ?? "",
                format: p.format,
                title: p.title,
                slides: slideCount,
              }),
            },
          );
          const record = await savePiece(p.id, {
            visual_output: "carousel",
            carousel: data.slides,
          });
          setCarouselState({ running: false, stage: null, completed: 1, total: 1, error: null });
          flash(
            data.fallback ? "Carousel story built from the local template" : "Carousel story ready",
            data.fallback ? "warn" : "ok",
          );
          return record;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setCarouselState({ running: false, stage: null, completed: 0, total: 1, error: message });
          throw err;
        }
      }),
    [withBusy, savePiece, flash],
  );

  const saveCarousel = useCallback(
    (pieceId: string, slides: CarouselSlide[]) =>
      savePiece(pieceId, { carousel: slides, visual_output: "carousel" }),
    [savePiece],
  );

  const generateCarouselVisual = useCallback(
    (p: PieceRecord, slideIndex: number, slides?: CarouselSlide[]) =>
      withBusy(`carousel:image:${slideIndex}`, async () => {
        if (slides) await saveCarousel(p.id, slides);
        const prompt = slides?.find((slide) => slide.index === slideIndex)?.visual_prompt;
        const data = await jfetch<{ record: PieceRecord }>("/api/ai/carousel-background", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pieceId: p.id, slideIndex, prompt }),
        });
        setPieces((items) => items.map((item) => (item.id === p.id ? data.record : item)));
        flash(`Slide ${slideIndex} visual ready`);
        return data.record;
      }),
    [withBusy, saveCarousel, flash],
  );

  const renderCarousel = useCallback(
    (p: PieceRecord, slides?: CarouselSlide[]) =>
      withBusy("carousel:render", async () => {
        if (slides) await saveCarousel(p.id, slides);
        setCarouselState({ running: true, stage: "render", completed: 0, total: slides?.length ?? p.carousel?.length ?? 0, error: null });
        try {
          const data = await jfetch<{ record: PieceRecord; outputDir: string }>("/api/carousel/render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pieceId: p.id }),
          });
          setPieces((items) => items.map((item) => (item.id === p.id ? data.record : item)));
          const total = data.record.carousel?.length ?? 0;
          setCarouselState({ running: false, stage: null, completed: total, total, error: null });
          flash(`Carousel exported: ${total} slides`);
          return data.record;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setCarouselState({ running: false, stage: null, completed: 0, total: 0, error: message });
          throw err;
        }
      }),
    [withBusy, saveCarousel, flash],
  );

  const generateAllCarouselVisuals = useCallback(
    (p: PieceRecord, slides: CarouselSlide[]) =>
      withBusy("carousel:all", async () => {
        let record = await saveCarousel(p.id, slides);
        const targets = slides.filter((slide) => !slide.background_path);
        setCarouselState({ running: true, stage: "images", completed: 0, total: targets.length, error: null });
        try {
          for (let i = 0; i < targets.length; i += 1) {
            const slide = targets[i];
            const data = await jfetch<{ record: PieceRecord }>("/api/ai/carousel-background", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pieceId: p.id,
                slideIndex: slide.index,
                prompt: slide.visual_prompt,
              }),
            });
            record = data.record;
            setPieces((items) => items.map((item) => (item.id === p.id ? record : item)));
            setCarouselState({
              running: true,
              stage: "images",
              completed: i + 1,
              total: targets.length,
              error: null,
            });
          }
          setCarouselState({ running: false, stage: null, completed: targets.length, total: targets.length, error: null });
          flash(targets.length ? "All carousel visuals are ready" : "Carousel visuals were already ready");
          return record;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setCarouselState((state) => ({ ...state, running: false, stage: null, error: message }));
          throw err;
        }
      }),
    [withBusy, saveCarousel, flash],
  );

  const finishCarousel = useCallback(
    (p: PieceRecord, slides: CarouselSlide[]) =>
      withBusy("carousel:finish", async () => {
        let record = await saveCarousel(p.id, slides);
        const targets = slides.filter((slide) => !slide.background_path);
        setCarouselState({
          running: true,
          stage: targets.length ? "images" : "render",
          completed: 0,
          total: targets.length || slides.length,
          error: null,
        });

        try {
          for (let i = 0; i < targets.length; i += 1) {
            const slide = targets[i];
            const data = await jfetch<{ record: PieceRecord }>("/api/ai/carousel-background", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pieceId: p.id,
                slideIndex: slide.index,
                prompt: slide.visual_prompt,
              }),
            });
            record = data.record;
            setPieces((items) => items.map((item) => (item.id === p.id ? record : item)));
            setCarouselState({
              running: true,
              stage: "images",
              completed: i + 1,
              total: targets.length,
              error: null,
            });
          }

          setCarouselState({
            running: true,
            stage: "render",
            completed: 0,
            total: slides.length,
            error: null,
          });
          const rendered = await jfetch<{ record: PieceRecord; outputDir: string }>(
            "/api/carousel/render",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pieceId: p.id }),
            },
          );
          record = rendered.record;
          setPieces((items) => items.map((item) => (item.id === p.id ? record : item)));
          setCarouselState({
            running: false,
            stage: null,
            completed: slides.length,
            total: slides.length,
            error: null,
          });
          flash(`Carousel ready: ${slides.length} slides`);
          return record;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setCarouselState((state) => ({ ...state, running: false, stage: null, error: message }));
          throw err;
        }
      }),
    [withBusy, saveCarousel, flash],
  );

  const rewrite = useCallback(async (text: string, instruction: string, voiceProfile?: string) => {
    // /api/ai/rewrite returns { rewritten, fallback? } or { error } on failure.
    const data = await jfetch<{ rewritten: string; fallback?: boolean }>("/api/ai/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, instruction, voiceProfile }),
    });
    if (data.fallback) flash("No AI engine available; text unchanged", "warn");
    return data.rewritten;
  }, [flash]);

  const revisePiece = useCallback(
    (p: PieceRecord, feedback: string) =>
      withBusy("revise", async () => {
        // /api/ai/revise takes the whole post + Palm's free-form feedback and
        // returns revised { title, hook, body, english }. The Thai master is
        // the single text for facebook/instagram; linkedin carries the
        // English rendition (decisions E7/E8 in 22-engine-redesign-decisions.md).
        const data = await jfetch<{
          title: string; hook: string; body: string; english: string; fallback?: boolean;
        }>("/api/ai/revise", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pieceId: p.id,
            feedback,
            title: p.title,
            hook: p.hook,
            body: p.body ?? "",
            english: p.platform_variants?.linkedin ?? "",
          }),
        });
        if (data.fallback) {
          flash("No AI engine available; post unchanged", "warn");
          return;
        }
        await savePiece(p.id, {
          title: data.title,
          hook: data.hook,
          body: data.body,
          platform_variants: {
            ...(p.platform_variants ?? {}),
            facebook: data.body,
            instagram: data.body,
            linkedin: data.english,
          },
        });
        flash("Post revised from feedback");
      }),
    [withBusy, savePiece, flash],
  );

  const runAudit = useCallback(
    (p: PieceRecord) =>
      withBusy("audit", async () => {
        // /api/ai/firewall takes { body } and returns per-category blocks
        // (slop / firewall / voice / quick_test), an overall verdict, and
        // fix_suggestions. Verdicts are pass | near_miss | fail.
        const report = await jfetch<FirewallReport>("/api/ai/firewall", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: `${p.title}\n${p.hook}\n${p.body ?? ""}` }),
        });
        await savePiece(p.id, {
          firewall_check: report.firewall.verdict,
          slop_check: report.slop.verdict,
          voice_check: report.voice.verdict,
          firewall_reasons: report.firewall.reasons,
          slop_reasons: report.slop.reasons,
          voice_reasons: report.voice.reasons,
        });
        return report;
      }),
    [withBusy, savePiece],
  );

  const generatePlatform = useCallback(
    (p: PieceRecord, platform: PlatformId) =>
      withBusy(`platform:${platform}`, async () => {
        // /api/ai/platform-pack takes { body, platforms, format } and returns
        // { variants: Partial<Record<PlatformId, string>>, fallback? }.
        const data = await jfetch<{
          variants: Partial<Record<PlatformId, string>>;
          fallback?: boolean;
        }>("/api/ai/platform-pack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: p.body ?? "", platforms: [platform], format: p.format }),
        });
        await savePiece(p.id, {
          platform_variants: { ...(p.platform_variants ?? {}), ...data.variants },
          platforms: p.platforms.includes(platform) ? p.platforms : [...p.platforms, platform],
        });
        flash(`${platform} pack ready`);
      }),
    [withBusy, savePiece, flash],
  );

  const copyPack = useCallback(
    (p: PieceRecord) =>
      withBusy("pack", async () => {
        // /api/publish/pack takes { pieceId, platforms? } and returns
        // { pack: string, sections, hero }. pack is always a formatted string.
        const data = await jfetch<{ pack: string }>("/api/publish/pack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pieceId: p.id }),
        });
        await navigator.clipboard.writeText(data.pack);
        flash("Pack copied to clipboard");
      }),
    [withBusy, flash],
  );

  const schedule = useCallback(
    (p: PieceRecord, when: string) =>
      withBusy("schedule", async () => {
        await savePiece(p.id, { scheduled_for: when, status: "scheduled" });
        flash(`Scheduled for ${when}`);
      }),
    [withBusy, savePiece, flash],
  );

  return {
    inbox, pieces, status, selected, selectedId, setSelectedId, loaded,
    toasts, flash, refreshAll, busy, autopilot, carouselState,
    savePiece, turnIntoPiece, runAutopilot, runDraft, rewrite, revisePiece, runAudit,
    buildCarousel, saveCarousel, generateCarouselVisual, generateAllCarouselVisuals, renderCarousel, finishCarousel,
    generatePlatform, copyPack, schedule,
  };
}

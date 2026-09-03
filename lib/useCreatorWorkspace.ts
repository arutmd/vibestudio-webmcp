"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { useStudio } from "./useStudio";
import type {
  ActivityRecord,
  BrainRecord,
  CarouselSlide,
  CreatorRecord,
  InspirationRecord,
  PieceRecord,
} from "./types";

type Studio = ReturnType<typeof useStudio>;
export type InspirationWithCreator = InspirationRecord & { creator: CreatorRecord | null };

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error ?? `${response.status} ${url}`);
  return data as T;
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function key(action: string): string {
  return `arutlee.${action}.${crypto.randomUUID()}`;
}

function starterSlides(source: InspirationWithCreator): CarouselSlide[] {
  const creator = source.creator?.display_name ?? "a saved creator";
  const beats = [
    ["AI สร้างคอนเทนต์ได้ แต่จำความเป็นคุณไม่ได้", "The missing layer is not another model. It is the context you can see, edit, and keep.", "A single creator silhouette facing a precise modular workspace"],
    ["ปัญหาไม่ใช่ความสามารถของโมเดล", "ChatGPT already writes, reasons, and generates strong images. Starting over each time is what makes the work slow.", "Repeated blank canvases becoming one continuous working surface"],
    ["แรงบันดาลใจเป็นจุดเริ่ม ไม่ใช่แม่แบบ", `We can borrow the ${source.title.toLocaleLowerCase()} mechanism from ${creator} without copying their identity.`, "One source artifact branching into an unmistakably different editorial story"],
    ["Template จำสิ่งที่ทำให้งานเป็นของคุณ", "Voice, audience, taste, goals, and production rules stay separate, editable, and traceable.", "A compact set of labeled template cards surrounding one clear identity portrait"],
    ["Skill จำวิธีทำงาน", "A carousel skill can be reused by any creator. Your Template is the part that makes the result yours.", "A reusable seven-step method connected to a separate creator identity layer"],
    ["ทุกการแก้ไขกลายเป็นหลักฐาน", "Reactions, revisions, versions, and undo make consistency visible instead of magical.", "A clean revision trail with one changed slide and a recoverable prior version"],
    ["เร็วขึ้น โดยยังเป็นคุณ", "Bring the agent you already use. VibeStudio supplies the memory, method, and workspace that grow with you.", "A finished seven-slide deck beside a calm creator workspace"],
  ];
  return beats.map(([title, body, visual_cue], position) => ({
    index: position + 1,
    kind: position === 0 ? "cover" : position === 6 ? "outro" : "section",
    title,
    body,
    visual_cue,
  }));
}

export function useCreatorWorkspace(studio: Studio) {
  const [creators, setCreators] = useState<CreatorRecord[]>([]);
  const [inspirations, setInspirations] = useState<InspirationWithCreator[]>([]);
  const [brain, setBrain] = useState<BrainRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [selectedInspirationId, setSelectedInspirationId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [creatorData, inspirationData, brainData, activityData] = await Promise.all([
      jfetch<{ records: CreatorRecord[] }>("/api/creators"),
      jfetch<{ records: InspirationWithCreator[] }>("/api/inspirations"),
      jfetch<{ records: BrainRecord[] }>("/api/brain"),
      jfetch<{ records: ActivityRecord[] }>("/api/activity?limit=60"),
    ]);
    setCreators(creatorData.records);
    setInspirations(inspirationData.records);
    setBrain(brainData.records);
    setActivities(activityData.records);
    setSelectedInspirationId((current) =>
      inspirationData.records.some((record) => record.id === current)
        ? current
        : inspirationData.records.find((record) => record.status === "saved")?.id ?? null,
    );
  }, []);

  useEffect(() => {
    void refresh().catch((error) => studio.flash(error instanceof Error ? error.message : String(error), "err"));
  }, [refresh, studio.flash]);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
      if (detail.entity === "inspiration" && detail.select && typeof detail.id === "string") {
        setSelectedInspirationId(detail.id);
      }
      void Promise.all([refresh(), studio.refreshAll()]).then(([, pieces]) => {
        if (detail.entity === "piece" && detail.select && typeof detail.id === "string") {
          studio.setSelectedId(detail.id);
        } else if (detail.entity === "piece" && typeof detail.id === "string") {
          const exists = pieces.some((piece) => piece.id === detail.id);
          if (exists) studio.setSelectedId(detail.id);
        }
      });
    };
    window.addEventListener("arutlee:data-changed", listener);
    return () => window.removeEventListener("arutlee:data-changed", listener);
  }, [refresh, studio.refreshAll, studio.setSelectedId]);

  const selectedInspiration = useMemo(
    () => inspirations.find((record) => record.id === selectedInspirationId) ?? null,
    [inspirations, selectedInspirationId],
  );

  const run = useCallback(async <T,>(label: string, work: () => Promise<T>): Promise<T | null> => {
    setBusy(label);
    try {
      return await work();
    } catch (error) {
      studio.flash(error instanceof Error ? error.message : String(error), "err");
      return null;
    } finally {
      setBusy(null);
    }
  }, [studio.flash]);

  const react = useCallback(async (
    inspiration: InspirationWithCreator,
    reaction: InspirationRecord["reaction"],
    note: string,
  ) => run("reaction", async () => {
    await jfetch(`/api/inspirations/${inspiration.id}`, json("PATCH", {
      reaction,
      reaction_note: note,
      expected_version: inspiration.version,
      idempotency_key: key("reaction"),
    }));
    await refresh();
    studio.flash(reaction === "like" ? "Saved what you like" : reaction === "dislike" ? "Saved what to avoid" : "Reaction cleared");
  }), [refresh, run, studio]);

  const updateCreator = useCallback(async (creator: CreatorRecord, status: CreatorRecord["status"]) =>
    run("creator", async () => {
      await jfetch(`/api/creators/${creator.id}`, json("PATCH", {
        status,
        expected_version: creator.version,
        idempotency_key: key("creator"),
      }));
      await refresh();
    }), [refresh, run]);

  const addCreator = useCallback(async (input: Pick<CreatorRecord, "platform" | "handle" | "display_name" | "profile_url" | "note">) =>
    run("creator", async () => {
      await jfetch("/api/creators", json("POST", {
        ...input,
        status: "active",
        idempotency_key: key("creator.add"),
      }));
      await refresh();
      studio.flash(`${input.display_name} added to your inspiration sources`);
    }), [refresh, run, studio]);

  const setInspirationSaved = useCallback(async (
    inspiration: InspirationWithCreator,
    saved: boolean,
  ) => run("inspiration", async () => {
    await jfetch(`/api/inspirations/${inspiration.id}`, json("PATCH", {
      status: saved ? "saved" : "feed",
      expected_version: inspiration.version,
      idempotency_key: key("inspiration.save"),
    }));
    await refresh();
    studio.flash(saved ? "Saved to your taste library" : "Removed from saved inspiration");
  }), [refresh, run, studio]);

  const saveBrain = useCallback(async (record: BrainRecord, patch: Partial<BrainRecord>) =>
    run("brain", async () => {
      await jfetch(`/api/brain/${record.id}`, json("PATCH", {
        ...patch,
        actor: "palm",
        expected_version: record.version,
        idempotency_key: key("brain"),
      }));
      await refresh();
      studio.flash("Brain updated");
    }), [refresh, run, studio]);

  const addBrain = useCallback(async (category: BrainRecord["category"], text: string) =>
    run("brain", async () => {
      await jfetch("/api/brain", json("POST", {
        category,
        text,
        tags: ["carousel-v1"],
        status: "active",
        authored_by: "palm",
        source_type: "direct_edit",
        source_id: null,
        actor: "palm",
        idempotency_key: key("brain.add"),
      }));
      await refresh();
      studio.flash("New memory added");
    }), [refresh, run, studio]);

  const createFromInspiration = useCallback(async (source: InspirationWithCreator) =>
    run("create", async () => {
      const context = await jfetch<{ receipt_id: string }>("/api/brain/context", json("POST", {
        purpose: "carousel_create",
        inspiration_id: source.id,
        skill_id: "carousel-v1",
      }));
      const created = await jfetch<{ record: PieceRecord }>("/api/pieces", json("POST", {
        inspiration_id: source.id,
        context_receipt_id: context.receipt_id,
        skill_id: "carousel-v1",
        skill_version: "1.0.0",
        title: "The missing layer between ChatGPT and consistent content",
        hook: "Models can generate. VibeStudio helps the work stay yours.",
        body: "A seven-slide story about an editable creator Template, reusable skills, and bring-your-own-agent workflows.",
        transformation_note: `Borrow the clear reveal mechanism from “${source.title}”, while changing the argument, copy, structure, composition, and Arutlee visual identity.`,
        carousel: starterSlides(source),
        idempotency_key: key("carousel.create"),
      }));
      const pieces = await studio.refreshAll();
      studio.setSelectedId(created.record.id);
      await refresh();
      studio.flash("Seven-slide Draft created");
      return pieces.find((piece) => piece.id === created.record.id) ?? created.record;
    }), [refresh, run, studio]);

  const createSession = useCallback(async (brief = "") =>
    run("session", async () => {
      const created = await jfetch<{ record: PieceRecord }>("/api/sessions", json("POST", {
        brief,
        output: "carousel",
        origin: "ui",
        connect: false,
        idempotency_key: key("session.start"),
      }));
      const pieces = await studio.refreshAll();
      studio.setSelectedId(created.record.id);
      await refresh();
      studio.flash("New Session ready — continue in Codex");
      return pieces.find((piece) => piece.id === created.record.id) ?? created.record;
    }), [refresh, run, studio]);

  const updateSlide = useCallback(async (
    piece: PieceRecord,
    slideIndex: number,
    patch: Partial<Pick<CarouselSlide, "title" | "body" | "visual_cue">>,
  ) => run("slide", async () => {
    await jfetch(`/api/pieces/${piece.id}/carousel`, json("PATCH", {
      slide_index: slideIndex,
      actor: "palm",
      ...patch,
      reason: "Edited in the visible carousel workspace",
      expected_version: piece.current_version ?? 1,
      idempotency_key: key("slide"),
    }));
    await Promise.all([studio.refreshAll(), refresh()]);
    studio.flash(`Slide ${slideIndex} updated`);
  }), [refresh, run, studio]);

  const setPieceStatus = useCallback(async (piece: PieceRecord, status: "draft" | "ready") =>
    run("status", async () => {
      await jfetch(`/api/pieces/${piece.id}/status`, json("POST", {
      status,
      actor: "palm",
        expected_version: piece.current_version ?? 1,
        idempotency_key: key("status"),
      }));
      await Promise.all([studio.refreshAll(), refresh()]);
      studio.flash(status === "ready" ? "Marked Ready" : "Returned to Draft");
    }), [refresh, run, studio]);

  const undo = useCallback(async (activity: ActivityRecord) => run("undo", async () => {
    await jfetch(`/api/activity/${activity.id}/undo`, json("POST", {}));
    await Promise.all([studio.refreshAll(), refresh()]);
    studio.flash("Previous version restored");
  }), [refresh, run, studio]);

  const finish = useCallback(async (piece: PieceRecord) => run("finish", async () => {
    await jfetch(`/api/pieces/${piece.id}/finish`, json("POST", {
      expected_version: piece.current_version ?? 1,
      idempotency_key: key("finish"),
    }));
    await Promise.all([studio.refreshAll(), refresh()]);
    studio.flash("Seven final slides are ready");
  }), [refresh, run, studio]);

  const review = useCallback(async (piece: PieceRecord) => run("review", async () => {
    await jfetch(`/api/pieces/${piece.id}/review`, json("POST", {
      expected_version: piece.current_version ?? 1,
      idempotency_key: key("review"),
    }));
    await Promise.all([studio.refreshAll(), refresh()]);
    studio.flash("Reviewed — you and Codex are in sync");
  }), [refresh, run, studio]);

  return {
    creators,
    inspirations,
    brain,
    activities,
    selectedInspiration,
    selectedInspirationId,
    setSelectedInspirationId,
    busy,
    refresh,
    react,
    updateCreator,
    addCreator,
    setInspirationSaved,
    saveBrain,
    addBrain,
    createFromInspiration,
    createSession,
    updateSlide,
    setPieceStatus,
    undo,
    finish,
    review,
  };
}

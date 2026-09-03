// Tiny formatting helpers shared across the UI.

export function shortDate(iso: string | undefined): string {
  if (!iso) return "·";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export function pillClass(verdict: string | undefined): string {
  switch (verdict) {
    case "pass":
      return "pill pill-ok";
    case "near_miss":
      return "pill pill-warn";
    case "fail":
      return "pill pill-block";
    case "blocked":
      return "pill pill-block";
    case "clear":
      return "pill pill-ok";
    default:
      return "pill pill-mute";
  }
}

export function statusPill(status: string | undefined): string {
  switch (status) {
    case "published":
      return "pill pill-ok";
    case "scheduled":
      return "pill pill-warn";
    case "qa_passed":
      return "pill pill-ok";
    case "draft":
      return "pill pill-mute";
    case "idea":
      return "pill pill-mute";
    case "held":
      return "pill pill-warn";
    case "skipped":
      return "pill pill-block";
    default:
      return "pill pill-mute";
  }
}

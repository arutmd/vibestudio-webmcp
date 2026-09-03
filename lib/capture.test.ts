import { buildCaptureIngredients, buildSmartCaptureRaw, type ScrapeCaptureResult } from "./capture";

function result(contentType: string): ScrapeCaptureResult {
  return {
    scraped: {
      url: "https://www.youtube.com/watch?v=demo",
      title: "Demo video",
      description: "A short YouTube summary.",
      body: "Demo video\n\nShort unavailable-caption summary.",
      siteName: "YouTube",
      contentType,
    },
    firewall_risk: "clear",
  };
}

const summary = buildCaptureIngredients(result("text/youtube-summary"));
if (summary.source_text_kind === "transcript") {
  throw new Error("youtube-summary must not be labeled as transcript");
}
const summaryRaw = buildSmartCaptureRaw("demo", result("text/youtube-summary"));
if (summaryRaw.includes("Source transcript:")) {
  throw new Error("youtube-summary raw packet must not say Source transcript");
}

const transcript = buildCaptureIngredients(result("text/youtube-transcript"));
if (transcript.source_text_kind !== "transcript") {
  throw new Error("youtube-transcript should be labeled as transcript");
}


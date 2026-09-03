import { buildChromeArgs, buildRenderHtml } from "./renderer";
import type { EngineVisualSpec } from "./types";

const spec: EngineVisualSpec = {
  templateId: "operator_note",
  width: 1080,
  height: 1350,
  title: "Voice AI action layer",
  subtitle: "A useful test",
  badge: "field note",
  footer: "linkedin / facebook",
  prompt: "No rendered text should leak raw HTML <script>",
  palette: {
    id: "operator_note",
    label: "Operator note",
    background: "#f7f5ef",
    panel: "#111111",
    accent: "#1b8f6a",
    text: "#f8f7f2",
    muted: "#bcb7aa",
  },
};

const html = buildRenderHtml(spec);
if (!html.includes("Voice AI action layer")) throw new Error("missing title");
if (html.includes("<script>")) throw new Error("html was not escaped");
if (html.includes("No rendered text should leak raw HTML")) {
  throw new Error("visual prompt should not be rendered into the card");
}

const args = buildChromeArgs({
  htmlPath: "/tmp/demo.html",
  outputPath: "/tmp/demo.png",
  width: 1080,
  height: 1350,
});
if (!args.includes("--window-size=1080,1350")) throw new Error("bad viewport args");
if (!args.includes("--screenshot=/tmp/demo.png")) throw new Error("bad screenshot arg");

// Voice-register check. Mirrors the Voice samples + Quick Test in
// 03-content-pillars-and-series.md. Looks for Palm-shape signals (Thai script,
// code-switching, modesty markers, concrete numbers) and absence of generic
// AI-creator voice.

export type VoiceHit = {
  category: "register" | "modesty" | "concreteness" | "warmth";
  severity: "warn" | "block";
  message: string;
};

const THAI = /[฀-๿]/u;
const NUMBER_WITH_UNIT =
  /\d+\s*(วัน|อาทิตย์|เดือน|ครั้ง|posts?|cases?|sessions?|tokens?|times?|รอบ|ชั่วโมง|hours?|min(?:utes?)?|words?|slides?|saves?|shares?|comments?|dms?|baht|usd|\$|฿|%)/i;
const MODESTY_TH = /(เพิ่งเริ่ม|จิงๆ|จริงๆ|จำไม่ได้|เอาจิงๆ|พอ(?:ใช้|ทำ)|ระวัง|กลัว|ไม่แน่ใจ|อาจอ่านผิด|ยังไม่เชื่อเต็มร้อย|ลอง[^ ]+ดู)/;
const MODESTY_EN = /\b(i('|'')m still|just (?:starting|began|got)|honestly,|might be wrong|not sure)\b/i;
const HYPE_VOICE = /\b(revolutionary|game[- ]changer|blazing fast|skyrocket|unleash|next[- ]level|cutting[- ]edge)\b/i;

export function runVoiceCheck(text: string): VoiceHit[] {
  const hits: VoiceHit[] = [];
  if (!text) return hits;

  // Code-switching is encouraged (Thai carrier + English tech terms). Pure
  // English with no Thai character is allowed for English-led posts but flagged
  // as 'warn' so Palm reviews the choice deliberately.
  const hasThai = THAI.test(text);
  const hasEnglishTech = /[A-Za-z]{2,}/.test(text);
  if (!hasThai) {
    hits.push({
      category: "register",
      severity: "warn",
      message:
        "No Thai script. Confirm this is an English-led piece; Palm's default register is code-switched.",
    });
  } else if (!hasEnglishTech) {
    hits.push({
      category: "register",
      severity: "warn",
      message:
        "Pure Thai with no English tech terms. Code-switching is the chat-voice register; check this is intentional.",
    });
  }

  // Concrete numbers with caveats: "ผมใช้ 20 ได้ 1 อาทิตย์" energy.
  if (!NUMBER_WITH_UNIT.test(text)) {
    hits.push({
      category: "concreteness",
      severity: "warn",
      message:
        "No concrete number-with-unit. Adding even one ('$20 lasts a week', '8 of 12 cases') sharpens credibility.",
    });
  }

  // Modesty markers — at least one Thai or English signal.
  if (!MODESTY_TH.test(text) && !MODESTY_EN.test(text)) {
    hits.push({
      category: "modesty",
      severity: "warn",
      message:
        "No modesty marker. Palm's chat-voice has these by default ('เพิ่งเริ่มฝึก', 'honestly,', 'might be wrong').",
    });
  }

  // Hype voice — warn, not block. Palm sometimes quotes hype words critically
  // (e.g. "everyone calls this 'next-level' but..."), and a hard block would
  // produce false positives. The block-level guarantee already comes from the
  // slop test catching these inside the banned-phrases regex.
  const hype = text.match(HYPE_VOICE);
  if (hype) {
    hits.push({
      category: "warmth",
      severity: "warn",
      message: `Hype-shaped phrase "${hype[0]}". Confirm this is quoting/critiquing, not endorsing.`,
    });
  }

  return hits;
}

export function voiceVerdict(hits: VoiceHit[]): "pass" | "fail" | "near_miss" {
  if (hits.some((h) => h.severity === "block")) return "fail";
  if (hits.length > 1) return "near_miss";
  return "pass";
}

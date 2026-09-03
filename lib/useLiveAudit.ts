"use client";

import { useEffect, useState } from "react";
import { runSlopTest, slopVerdict, type SlopHit } from "./slop";
import { runFirewall, firewallVerdict, type FirewallHit } from "./firewall";
import { runVoiceCheck, voiceVerdict, type VoiceHit } from "./voice";

export type LiveAuditVerdict = "pass" | "fail" | "near_miss" | "not_run";

export type LiveAuditResult = {
  ran: boolean;
  slop: { verdict: LiveAuditVerdict; reasons: string[]; hits: SlopHit[] };
  firewall: { verdict: LiveAuditVerdict; reasons: string[]; hits: FirewallHit[] };
  voice: { verdict: LiveAuditVerdict; reasons: string[]; hits: VoiceHit[] };
};

const EMPTY: LiveAuditResult = {
  ran: false,
  slop: { verdict: "not_run", reasons: [], hits: [] },
  firewall: { verdict: "not_run", reasons: [], hits: [] },
  voice: { verdict: "not_run", reasons: [], hits: [] },
};

// Debounced rule-based audit. Re-runs slop / firewall / voice each time the
// body text settles for `delayMs` ms. Pure client-side: every check is
// deterministic and synchronous, no network round-trip.
//
// AI qualitative passes still run on explicit "Audit" or Run All — those are
// expensive and don't belong in a keystroke-driven hook.
export function useLiveAudit(text: string, delayMs = 1500): LiveAuditResult {
  const [result, setResult] = useState<LiveAuditResult>(EMPTY);

  useEffect(() => {
    if (!text || !text.trim()) {
      setResult(EMPTY);
      return;
    }
    const handle = setTimeout(() => {
      const slopHits = runSlopTest(text);
      const fwHits = runFirewall(text);
      const voiceHits = runVoiceCheck(text);
      setResult({
        ran: true,
        slop: {
          verdict: slopVerdict(slopHits),
          reasons: slopHits.map((h) => h.message),
          hits: slopHits,
        },
        firewall: {
          verdict: firewallVerdict(fwHits),
          reasons: fwHits.map((h) => h.reason),
          hits: fwHits,
        },
        voice: {
          verdict: voiceVerdict(voiceHits),
          reasons: voiceHits.map((h) => h.message),
          hits: voiceHits,
        },
      });
    }, delayMs);
    return () => clearTimeout(handle);
  }, [text, delayMs]);

  return result;
}

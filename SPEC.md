# Arutlee Studio: Spec & Iteration Plan

Single source of truth for what Studio should do, how today's reality diverges, and what to fix next.

**Foundation:** Palm's walkthrough recovered from Claude Code transcript (2026-04-27 17:29) and preserved verbatim in each "Vision" block. Friction observations from real publishing (2026-04-28 first quick-win, FB post for Bevel 3.0 + Whoop lawsuit) layered in as "Today" / "Gaps" / "Acceptance."

This file replaces both `SPEC-RAW.md` and `FRICTION-LOG.md`. Visual + IA spec stays in `DESIGN.md`; gap notes against DESIGN.md appear in the cross-cutting section below.

**Severity:**
- **P0**: breaks the publish flow today; must fix before next post
- **P1**: spec gap that hurts every publish; top of next iteration
- **P2**: quality-of-life
- **P3**: latent / theoretical

---

## 0. Memorable thing

> "The most efficient, automated, high-quality content studio I've used."

(From DESIGN.md. Speed + automation + quality gates. Every IA, layout, and interaction decision serves that line.)

Three modes (Intake / Workbench / Desk) cover the full pipeline:

```
INTAKE         WORKBENCH                            DESK
─────────      ────────────────────────────         ───────────
capture +      piece editor                         calendar +
research                                            metrics +
                                                    closed-loop
```

---

## 1. Intake

### Vision (Palm 2026-04-27)

> main function similar to notebookLM to fetch the sources, gather as much information around the content, topic, including 5 pictures that is related to that (the reason is the will become the single source of truth for this particular card so claude need to fetch, search, find out more then write it down as .md for the topic under a folder with pictures related to it or person related to it)
>
> and it shuould be dynamic, i dont to choose the sources, or separate field for URL, just 1 empty box that claude will read and go write. (No hallucination accepted, only legit sources is allow)
>
> 1. LinkedIn : Text + Photo : Profesional tone : in english context
> 2. Facebook : Text + Photo + Reels + carosal : Confident, Warm, Easy reading in thai
> 3. Instagram : Reels + Carosal + Caption / Thread : Caption + Photo
> 4. X : Text + Photo
> 5. Tiktok : Reels + Carosal + Caption
> 6. Youtube : Reels
>
> so claude will need to suggest in the card which social media platform can this be posted too and what kind of format with tier S, A, B, or X
>
> -> Ideate this is a button where claude ask me to confirm its preselected platform that it will get turned to, I can overide by toggle on/off if i want some or dont want some
> Once I click ideate this card turn into called "Pieces"

### Refinement (Palm 2026-04-28, mid-quick-win)

> i think there should be aphase for us to brainstorm (like we just did) and like now after i see what you found i want to prompt more

A separate brainstorm phase between research and Ideate, where Palm reads what Claude found and prompts more questions before committing to an angle.

### Today

- `POST /api/inbox` persists exactly the raw string. `inbox-20260428-001` stored 53 chars: `"Bevel 3.0 is out, start up that got sued by whoop"`. No fetching, no enrichment, no photos pulled, no folder created.
- `POST /api/ai/ideate` calls Claude Code CLI with `--tools ""` (no web access, hallucination risk on news topics).
- No brainstorm phase. The flow is `Capture → Ideate (one-shot) → Promote`. Today's brainstorm happened in this Claude Code conversation, not in Studio.
- No per-platform tier rating.
- `app/api/scrape/route.ts` exists for URL scraping but uses a default UA that Reddit + Numerama + many CDNs block.
- `WebFetch` (Anthropic's fetcher) is also blocked by Reddit + Numerama; `curl` with browser UA + Referer works fine.

### Gaps

- **P1: Intake = NotebookLM-style with folder output** (was F-001 + F-005 + F-006)
  Capture should: (a) detect URLs in raw, (b) detect "thin" non-URL seeds and offer to web-search, (c) curl-with-UA scrape multiple sources, (d) summarize via Claude, (e) download ~5 reference photos, (f) create `pieces/<slug>/` folder with `sources.md` + `photos/` + per-platform subfolder stubs. Inbox row gets `enriched_at`, `enrichment_path`, `image_paths[]`.
- **P1: Brainstorm phase between research and Ideate** (raised by Palm 2026-04-28)
  After research, before Ideate, a multi-turn chat panel against the enriched material. Output: refined direction stored on the inbox row as `direction:` text. Multiple iterations allowed.
- **P1: Give Claude web access in research / ideate routes** (was F-003)
  `lib/claude.ts` invokes CLI with `--tools ""`. Drop that for research/ideate; pass `--allowed-tools "WebFetch,WebSearch"`. Cost: subscription request slots; gate behind opt-in flag per call.
- **P2: Browser UA + sensible Referer in `/api/scrape`** (was F-004)
  Current scraper hits the same wall as WebFetch. Use Mozilla UA, set Referer to source domain, special-case Reddit (`old.reddit.com/.../comments/<id>.json`).
- **P3: Tier S/A/B/X classification per platform** (was F-007)
  Useful, not blocking. Wait until research loop is solid.

### Acceptance for next iteration

Drop a one-liner like the Bevel seed → Studio enriches it autonomously → Palm gets a brainstorm chat → angle locks → Ideate produces 3 candidates with platform tier ratings + firewall risk → Promote creates piece + folder + linked inbox source. Total time from drop to "ready to draft": under 5 minutes.

---

## 2. Workbench

### Vision (Palm 2026-04-27)

> Workbench is where idea get turns into content
>
> on each pieces there will be an area for source of truth collapsible and editable at the top + 5 pictures related to it (not AI generate picture)
>
> pieces gets auto generate
> 1. Text, Caption,
> 2. If its a photo then AI generate prompt for that photo/carosal (we will need to fugure out a prompt or a tools so that image generated is high quality and match to the content and most importantly follow our design/IP so its gets recognize all the time)
> 3. if its a script then claude write a script with editing prompt instruction for /remotion
>
> -> for once i press save the edit is save but not committed yet. if i press submit that particular platform card gets turned into called ready to ship
>
> -> for ready to ship each content is categorized by platform now with all the things it needs for posting.
>
> -> only ready to ship content is allowed to be drag and drop to schedule calendar, or i can manually type in the schedule work like calendar app
>
> every card that is dropped in the calendar is mark as pending automatically meaning if nothing change it will get posted automaticall (we will need to find a tools to make the posting API pausible)
>
> the content that has gone public are turned from pending -> published or error if error occured

### Today

- Workbench exists (`components/Workbench.tsx`) with three-column layout per `DESIGN.md`. Includes `useLiveAudit` debounced rule-based check, sticky vital strip, Run All chain (`⌘R` → draft → variants → carousel → audit).
- DraftPanel renders one body textarea + a hint card showing made-up spine labels (`CHIEF COMPLAINT / HISTORY / DIFFERENTIAL / ...`). Doesn't match DESIGN.md OPD/IPD spec, doesn't render sections as separate textareas.
- No "5 reference photos" panel above the editor (real source photos from Intake). Visual prompt generator exists but only for AI-generated hero images (ChatGPT Image 2.0 prompts). The two image needs (real reference photos for context vs. AI-generated hero for IP) are conflated.
- `pieces.jsonl` status enum: `idea | draft | qa_passed | scheduled | published | held | skipped`. There's no `ready_to_ship` state distinct from `qa_passed`. Save-vs-Submit distinction exists only as autosave on PATCH, no commit boundary.
- Per-platform variant editing exists (`PlatformPanel.tsx`); per-platform subfolder for assets does not.
- Slop/firewall/voice run on `body` only, not on `title` or `hook`. Concrete bite today: Claude Code wrote em-dash in the title (`"Bevel 3.0, 20 คน..."`), slop didn't fire because slop only inspects body.
- Firewall is keyword-based. It does not detect "origin-of-insight" drift (e.g., a post that doesn't mention Cariva but draws on Cariva-internal knowledge). Per `12-open-work.md` Reviewer Concern #3 this is a known gap; today's quick-win avoided it by Claude Code self-censoring an EMR critique line, but Studio gave no warning.
- Studio's AI Draft button calls `/api/ai/draft` with no web access. For news-grounded posts, the draft is unusable until source material is hand-fed. Today's draft was written entirely in Claude Code, then PATCHed back to the piece.

### Gaps

- **P1: Source of truth panel at top of editor** (was F-006)
  Above the body textarea, render a collapsible "Sources" panel showing the 5 reference photos + summary from `pieces/<slug>/sources.md`. Read-only. Editable inline on click → updates `sources.md` on disk.
- **P1: Format-aware editor with correct spine** (was F-011)
  Per DESIGN.md: extend `PieceFormat` to 6 values (`field_note`, `casefile_opd`, `casefile_ipd`, `filter`, `anchor`, `threads_card`). Replace generic `casefile` with OPD/IPD split. Render section spine inline as separate textareas with the correct labels (CC/PI/PH/PE/IX/TX for OPD, S/O/A/P for IPD, Hook/Body/Caveat for field_note, Setup/Filter/Decision for filter, Hook/Body/Receipts for anchor, single quote for threads_card). Body still saves as one markdown blob with H2 headers.
- **P2: Slop/firewall/voice run on title + hook, not just body** (was F-013)
  Either extend `useLiveAudit` to lint title + hook, or run rule-based slop inside POST/PATCH handlers so the API rejects em-dashes at write time. Defense in depth.
- **P2: Firewall: origin-of-insight detection** (new gap, surfaced today)
  Beyond keyword matching, the firewall should warn when a piece's *insight* could only come from Palm's Cariva/Vein work even if the post text doesn't mention either. Hard to automate fully, at minimum, surface a "Origin self-check" prompt before promote-to-ready: *"Could a reader trace this insight back to your day-job clinical work? If yes, reframe or skip."* Gate the firewall verdict on Palm answering it.
- **P2: Save vs Submit distinction modeled** (was F-008)
  Add `status: "ready_to_ship"` (post-firewall, pre-schedule). Save = autosave to disk; Submit = transition state to `ready_to_ship`. Schedule UI gates on this state.
- **P2: Per-platform subfolder created on first variant** (subset of F-005)
  When the first variant is generated, mkdir `pieces/<slug>/platforms/<platform>/`. Drop generated visual prompts, hero image candidates, captions there. The piece folder becomes self-contained for archival.
- **P2: Real-photo-composite hero brief, not AI-generated-only** (was F-006)
  Visual prompt generator should support two modes: (a) AI hero (current, ChatGPT Image 2.0 prompt), for evergreen pieces; (b) real-photo composite brief, for news-pegged pieces, specifies which of the 5 reference photos to layer + the Arutlee chart-form headline overlay on top. Today's quick-win uses (b).
- **P1: Granular collaborative-edit pattern** (new, F-015, surfaced 2026-04-28 during quick-win revision)
  Today's flow forces whole-blob regeneration: AI Draft button rewrites the entire body, losing parts Palm liked. Real iteration is paragraph-by-paragraph. Studio needs:
  (a) **Highlight + ask**: select text → keyboard shortcut → mini-chat with selection as context → "rewrite punchier / cut / more like Peesamac" → preview diff → accept/reject. Other paragraphs untouched.
  (b) **Per-section AI buttons**: small ✨ icon next to each paragraph → click to get 3 alternative phrasings → pick one, regenerate just that.
  (c) **Suggestion mode**: Google-Docs-style tracked-changes UX where AI suggestions appear as inline edits Palm accepts/rejects per-suggestion, not all-or-nothing.
  (d) **Voice rewrite presets**: stored "voice profiles" parsed from `pipeline/creators/` (Peesamac / Rawit / Annabel / Aun / etc.). Highlight → pick profile → rewrite in that register, with a side-by-side before/after.
  (e) **English / Thai split-view**: two columns, edit either side, translate-toggle on each paragraph. Today Palm explicitly said English-first → Thai-translate is the better workflow; Studio has zero UI representation of this split.
  Where to fix: new `components/InlineEditor.tsx` replacing the textarea inside DraftPanel + new `app/api/ai/rewrite/route.ts` that takes a selection + instruction + voice profile.
- **P2: Audit reasons persisted to piece** (new, F-014, surfaced 2026-04-28)
  Currently `/api/ai/firewall` returns the full report (slop/firewall/voice/quick_test reasons + fix suggestions) but only the coarse verdict gets stored on the piece via PATCH. The detailed reasons live in client session-state and are lost on page reload. Need to either persist the latest report on the piece (as `last_audit_report` JSON) or auto-write to `pieces/<slug>/firewall-audit-vN.json` and have FirewallPanel read from disk on load.
- **P1: DraftPanel doesn't resync local state when piece prop updates** (new, F-016, real bug surfaced 2026-04-29 02:00)
  `components/DraftPanel.tsx:99-103` initializes `title`, `hook`, `body`, `format`, `notes` via `useState(piece.X)` with no companion `useEffect` to reset when the `piece` prop changes. Result: any external update to the piece (PATCH from another tool, Run All chain rewriting body, sub-agent autocomplete) is invisible to the user until they hard-refresh or switch pieces. Today's quick-win was visibly stuck on stale draft state until manual refresh.
  Fix: add `useEffect(() => { setTitle(piece.title); setHook(piece.hook); setBody(piece.body ?? ""); setFormat(piece.format); setNotes(piece.notes); }, [piece.id, piece.updated_at])`. ~5 lines. Same fix needed in any other component that mirrors piece state into local useState. Bundle with F-014 + F-015 since they're all the same DraftPanel state-sync cluster.

### Acceptance for next iteration

Drop a piece into Workbench. Top panel auto-renders the 5 reference photos + sources summary. Body editor renders sections per the format's spine. Live audit fires on every edit, including title and hook. Origin self-check prompt appears before status moves to `ready_to_ship`. Per-platform subfolders exist on disk after first variant. Visual brief offers real-photo-composite mode for news pegs.

---

## 3. Desk

### Vision (Palm 2026-04-27)

> only publishedd content are seen in this app
>
> we will see how many contents was posted,
>
> we will also need an API for this dashboard to see metrics, engagement, reach, or any other metrics for each platform and present it in
>
> it should be able to track account metric on follower , growth etc
>
> ***
>
> closed-loop functionality, periodically claude fetch published content and analyzes the performance and use it to adjust or improve the content strategy, so next time the flow start claude do better as well as adjust tier considering if similar content has recieved a good engagement so a new post is suggested
>
> each idea remain the folder for that idea, for each platform we worked for that idea it gets a subfoler with resources geneated image, video for that platfrom post

### Today

- `MetricsPanel.tsx` exists, reads `data/metrics.jsonl`. Append-only snapshots per piece per platform per window (24h / 7d / 30d). Manual entry; no auto-fetch from platforms.
- `ReviewPanel.tsx` does an AI-prepped Sunday review (Role 2 from `16-data-system.md`). Output is markdown + a decision row appended to `decisions.jsonl`.
- Schedule is a date input + 3 publish modes (`pack` / `webhook` / `buffer`). No drag-and-drop calendar.
- Buffer integration exists for auto-posting (paid Buffer account required). Webhook integration is generic outbound JSON. Pack mode copies a per-platform paste-pack to clipboard.
- No closed-loop: metrics don't feed back into Ideate's prompt context. Last 4 weeks of high-performing piece patterns are not surfaced when generating new candidates.
- Account-level metrics (follower count, growth) are not tracked. Only per-piece engagement.

### Gaps

- **P2: Drag-and-drop calendar for scheduling** (was F-009)
  Replace date-input scheduler with a week/month grid. Only `ready_to_ship` pieces are draggable. Drop on date → status moves to `scheduled` with the dropped time. Manually-typed dates also accepted.
- **P2: Closed-loop metrics → Ideate** (was F-010)
  When Ideate runs, include the last 4 weeks of high-performing piece summaries in the system prompt as "what's been working." Slow-moving signal, real value.
- **P2: Pausable auto-post from calendar**
  Per Vision: "every card that is dropped in the calendar is mark as pending automatically meaning if nothing change it will get posted automatically (we will need to find a tools to make the posting API pausible)." Today: there's no pending-but-pausable state. Need a pre-publish window (e.g., 30 min before scheduled time) where Palm can cancel.
- **P2: Account-level metrics tracking**
  New file `data/account_metrics.jsonl` with daily snapshots: follower count, growth delta, total impressions per platform. Manual entry until platform APIs are wired.
- **P3: Per-platform subfolder asset archive** (sub-spec of F-005)
  After publish, the per-platform subfolder freezes with the published version of the asset. Useful for retro-analysis ("what did we actually ship for this piece?").

### Acceptance for next iteration

Open Desk. See a calendar with `ready_to_ship` pieces in a side panel, draggable onto dates. Pending-state pieces show countdown to auto-publish with a pause button. Metrics tab shows per-piece + account-level trends. Sunday review surfaces the closed-loop pattern: "Posts about consumer health-tech got 3.2× engagement vs general AI posts last month, Ideate is now biased toward that pillar."

---

## Cross-cutting concerns

### Quality gates

Three rule-based libraries enforced at write time:

- `lib/slop.ts`, em-dashes, banned vocab, embellishment, AI-creator structure, ChatGPT-default voice
- `lib/firewall.ts`, Cariva/Vein keywords (hard block), origin-context drift (soft warn, currently underdeveloped, see Workbench §F-...)
- `lib/voice.ts`, code-switched Thai-English presence, modesty markers, concrete numbers + caveats, no hype voice

**Discipline rule:** rule-based floor runs first, always, on every edit. AI qualitative pass runs second, only on explicit Audit. Block-level rule failures cannot be overridden by the AI.

**Today's gap:** these run on `body` only. Title and hook bypass. See P2 above.

### AI engine

Three engines in priority order (per `lib/claude.ts:resolveEngine`):

1. `ANTHROPIC_API_KEY` set → Anthropic SDK direct (paid)
2. `claude` CLI on PATH → spawn `claude -p` subprocess (subscription, $0)
3. Neither → deterministic fallbacks

Default for Palm = #2. Engine indicator (StatusBar bottom-right) shows verified responsiveness (live ping, latency, click-to-recheck), added 2026-04-28 in this session.

**Open:** routes that need web access (research, ideate) currently invoke CLI with `--tools ""`. Drop that for those routes; pass `--allowed-tools "WebFetch,WebSearch"` instead.

### Visual IP

- `15-visual-ip-brief.md` (parent project) is the visual source of truth: medical-chart aesthetic for public posts, Apple-native chrome for Studio (per DESIGN.md split).
- Day-1 IP kit: wordmark / 2-3 color rules / Thai+Latin font pairing / Field Note template / hero-photo treatment / metadata motif.
- Two image generation needs:
  - Real reference photos (5 per piece, fetched at Intake), context for the writer, not for publishing
  - AI-generated hero or carousel for the public post (ChatGPT Image 2.0, follows IP)

### DESIGN.md drift

Most of DESIGN.md (three modes / Run All / live audit / resume-here / global capture / updated_at) is implemented. The remaining drift is the format-spine gap (P1) covered in Workbench §Gaps.

### Local-only operation

Per Vision: "im a liittle concern about backend we really dont want the app to be complicated it can always run in local, i will only use it on my macbook anyway i dont want to have to link it to supbase or vercel"

Studio is localhost-only. JSONL filesystem layer at `../data/`. No DB, no auth, no cloud. This is preserved.

---

## Iteration backlog (prioritized)

Tomorrow's queue, derived from sectional gaps. Each row is a self-contained shipped change.

| ID | Title | Severity | Bundles gaps | Reason to bundle |
|---|---|---|---|---|
| BL-1 | Intake = NotebookLM with folder output + brainstorm phase | P1 | F-001, F-002, F-005, F-006-real-photos | Single feature: capture → enrichment → folder → brainstorm → ideate. Splitting it ships a half-broken pipeline. |
| BL-2 | Give Claude web access in research/ideate routes | P1 | F-003, F-004 | The Intake feature in BL-1 depends on both web access and a working scraper. Pair them. |
| BL-3 | Format-aware editor matches DESIGN.md spec | P1 | F-011 | Independent of BL-1 and BL-2. Can run in parallel. |
| BL-4 | Slop/firewall/voice run on title + hook | P2 | F-013 | Tiny change. Defense in depth. Can ship same week as BL-1. |
| BL-5 | Save vs Submit (`ready_to_ship` state) + per-platform subfolder | P2 | F-005 (sub), F-008 | Workbench polish. Wait until BL-1 ships so we know the folder shape. |
| BL-6 | Drag-and-drop calendar + pausable auto-post | P2 | F-009, Desk pausable | Desk polish. Lower priority, manual scheduling works for now. |
| BL-7 | Origin-of-insight firewall warning | P2 | new (Workbench §gaps) | Hard to automate fully; minimum-viable = explicit prompt before `ready_to_ship`. Bundle with BL-5. |
| BL-8 | Closed-loop metrics → Ideate | P2 | F-010 | Wait until enough metrics rows exist (~20 pieces) for the signal to be useful. |
| BL-9 | Tier S/A/B/X classification per platform | P3 | F-007 | After research loop is solid. |
| BL-10 | Account-level metrics tracking | P3 | new (Desk §gaps) | Useful but manual today. Wait until platform APIs justify automation. |

### Recommended order

1. **BL-1 + BL-2 together** (Intake rebuild + web access). The biggest single quality-of-life win. Estimated 1-2 days. Touches: `app/api/inbox/route.ts`, new `app/api/intake/research/route.ts`, new `app/api/intake/brainstorm/route.ts`, `app/api/scrape/route.ts`, `lib/claude.ts`, `components/IntakePanel.tsx`, types.
2. **BL-3 in parallel** (format spine). Separate file set (DraftPanel + types + prompts). Can ship independently. Estimated 0.5 day.
3. **BL-4** (slop on title/hook). Tiny. Ship same day as BL-1.
4. **BL-5 + BL-7 together** (Save/Submit + origin firewall prompt). Both touch Workbench state. Estimated 0.5 day.
5. **BL-6** (calendar + pausable). Estimated 1 day. Schedule for week 2.
6. **BL-8 / BL-9 / BL-10** opportunistic.

---

## Today's session log (2026-04-28)

- Built Desktop launcher app (`~/Desktop/Arutlee Studio.app`), one-click start
- Live ping indicator added to StatusBar (`app/api/status/ping/route.ts` + `components/StatusBar.tsx`), fixes F-012
- First end-to-end quick-win: Bevel 3.0 + Whoop FB post
  - inbox-20260428-001 captured (Studio, raw text only)
  - Research done in Claude Code (not Studio): WebSearch + curl Reddit JSON + Numerama HTML
  - Piece folder created by hand: `pieces/whoop-vs-bevel-30/` with `sources.md` + 5 photos in `photos/` + `draft.md`
  - Piece promoted via API: `field-note-20260428-001`, lead_platform=facebook
  - Body drafted in Claude Code, PATCHed back to piece (1351 chars, 138 Thai words, zero em-dashes, EMR-critique line self-censored per origin firewall)
  - **Pending in this session:** FB platform variant + visual brief + firewall audit + pack/publish

This session surfaced gaps F-001 through F-013 (now folded into the sectional gaps above). The quick-win publishing continues; this spec doc is what we ship to tomorrow's iteration.

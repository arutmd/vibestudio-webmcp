# Design QA — Template Studio direct editing

## Comparison target

- Source visual truth: `docs/design/template-studio-option-1.png`
- Matched agent-proposal implementation: `docs/design/template-studio-agent-with-editor-1472.png`
- Equal-pixel full-view comparison: `docs/design/template-studio-agent-comparison-1472-final.png`
- New direct-edit state: `docs/design/template-studio-direct-edit-1472-final.png`
- Normal-window direct-edit state: `docs/design/template-studio-direct-edit-final.png`
- State: dark desktop VibeStudio, Template selected, Draft v8 and Cover selected. The matched comparison uses the Agent tab; the direct-edit evidence uses the new Edit tab required by the user.

## Viewport and normalization

- Source pixels: 1487 × 1058.
- Matched implementation capture: 1457 × 1036 CSS content pixels at density 1, captured with a 1472 × 1047 browser viewport override.
- Normalization: both sides were scaled once to 1487 × 1058 and placed in one 2974 × 1058 comparison image. No crop was applied.
- Direct-edit implementation capture: 1457 × 1036 CSS content pixels at density 1.
- Responsive checks: 900 × 900 and 600 × 900 viewport overrides. At both sizes, document scroll width equalled client width; no horizontal overflow was present. The viewport override was reset before handoff.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the shell retains the SF-system stack. The editorial template uses Iowan Old Style with Baskerville/Georgia fallbacks, preserving the source's high-contrast serif character, title scale, two-line wrap, line height, and small-label hierarchy. Inline inputs inherit those same canvas faces, so edit mode does not visually jump.
- Spacing and layout rhythm: header, version rail, 4:5 canvas, thumbnail strip, and inspector maintain the source's hierarchy. The new Edit/Agent segmented control occupies the inspector header without shifting the canvas or hiding proposal content. Compact and narrow layouts remain scrollable without clipping persistent controls.
- Colors and visual tokens: VibeStudio charcoal, warm white, coral, and green status tokens map consistently to the source. Selection bounds, editable-element chips, dirty state, locked state, and disabled Save state each have distinct semantics.
- Image quality and asset fidelity: the mountain-and-mist cover and Lena Park portrait remain dedicated raster assets, sharp at their rendered sizes and correctly integrated into the warm editorial paper treatment. Image replacement and crop controls do not substitute fake imagery or CSS art.
- Copy and content: editing instructions are explicit and short: click to select, double-click text to type, then save or add the exact element to Talking about. The Agent tab preserves the original 48px → 64px proposal, receipt, accept/reject actions, and immutable-version explanation.
- Icons and affordances: Phosphor icons remain consistent with the product system. Canvas hover/selected states, Edit/Agent tabs, dirty/saved states, editable field chips, and the image-edit affordance make direct manipulation discoverable.
- Accessibility and states: canvas fields are keyboard reachable and semantically labelled. Inspector fields have explicit accessible names. Locked versions remove edit tabs and mutation inputs. Focus, selected, disabled, saved, unsaved, and read-only states were exercised.

## Comparison history

### Iteration 1 — blocked

- P1 image fidelity: the initial author treatment used an unrelated cropped card. Fixed with `public/template-studio/lena-park.png`.
- P2 canvas art direction: the first mountain crop reduced the intended negative space. Fixed by shifting the dedicated mountain-and-mist raster.
- P2 typography and vertical rhythm: title, body, and author spacing drifted from the visual target. Fixed with the available Iowan Old Style face and corrected line boxes and margins.
- P2 version hierarchy and compact overflow: fixed with the persistent green locked rail and tighter responsive grid tracks.

### Iteration 2 — passed visual-system build

- Post-fix evidence: `docs/design/template-studio-comparison-final-06.png`, `docs/design/template-studio-focus-canvas-final.png`, and `docs/design/template-studio-focus-proposal-final.png`.
- Version browsing, proposal acceptance/rejection, comparison mode, slide selection, and locking passed.

### Iteration 3 — passed direct-edit build

- The original canvas was read-only, a P0 core-use gap exposed by the user's browser annotation. Fixed by adding a first-class Edit inspector plus direct in-canvas editing while retaining Agent proposals as a separate tab.
- Inspector editing changed title, body, author, and background crop state live on the canvas. Double-clicking the H1 opened an inline editor and updated the canvas immediately. Save changed the draft to a disabled saved state.
- The v7 inspector was verified read-only with no edit tabs; Return to latest restored editable v8.
- Add to Talking about produced the exact WebMCP receipt for `template:v8:slide:1:body`, including the current body text, `change` role, and version 8. It did not collapse the selection to a generic whole-page reference.
- Agent proposal and Edit tabs were both exercised. The refreshed app produced no browser warnings or errors.
- Final evidence: `docs/design/template-studio-agent-comparison-1472-final.png` and `docs/design/template-studio-direct-edit-1472-final.png`.

## Follow-up polish

- P3: the generated mountain subject is not pixel-identical to the ideation mock, but it matches the monochrome alpine subject, fog density, negative-space ratio, and editorial paper art direction.
- P3: browser-native file chooser styling is intentionally hidden behind the on-brand Replace image control.

## Implementation checklist

- [x] Direct Edit and Agent proposal modes are distinct and functional.
- [x] Kicker, H1, body, author, image replacement, and image crop are editable.
- [x] Double-click text editing and inspector editing both work.
- [x] Exact element context can be added to Shared Attention and read through WebMCP.
- [x] Draft save, locked-version read-only state, proposal review, comparison, slide selection, and lock controls work.
- [x] Desktop, tablet, and narrow layout checked.
- [x] Typecheck, 29 local test files, production build, browser interactions, and fresh-load console checked.

final result: passed

# VibeStudio WebMCP access and contextual-sidebar audit

Date: 2026-09-02

## Evidence reviewed

- `01-overloaded-right-sidebar.png` — creator-reported Template Studio sidebar at 490 × 1564.
- `02-agent-settings.png` — verified Agent settings at the live VibeStudio viewport.
- `03-template-sidebar-after.png` — verified simplified Template Studio after implementation.
- Live WebMCP registration notifications from the in-app browser.

## Findings

1. **The right sidebar had five jobs.** It mixed target context, Codex prompting, manual editing, save state, history policy, and trust messaging in one narrow column. That made the contextual task feel like a second application.
2. **The same state appeared in several places.** Working version, saved state, immutability, and human-agent policy repeated information already visible in the header and version history.
3. **Agent authority was invisible.** A creator could not see or control which WebMCP functions Codex could actually call.
4. **A settings problem was being solved inside every page.** Pointer controls and agent access are permanent preferences, not page-specific work.

## Implemented model

1. **Keep the page contextual.** Template Studio's right side now contains only the selected target, one Codex composer, a reviewable proposal, and optional manual rules.
2. **Autosave the working version.** The large save button and duplicated status rows are gone. A compact header receipt shows `Saving changes…` or `All changes saved`.
3. **Move permanent controls to Agent settings.** The left rail now opens one settings surface with WebMCP access and Pointer controls.
4. **Expose real authority.** WebMCP settings contain a master switch, six capability groups, and a toggle for each of the 21 implemented tools.
5. **Remove disabled tools from the agent.** A disabled function is not registered through WebMCP. The master switch aborts every registration.
6. **Keep the safety boundary explicit.** VibeStudio exposes no publish or delete tool. Schedule and Template write access remain independently controllable.
7. **Persist without transient access.** Preferences survive reloads, and WebMCP starts closed until the saved preference has been read on the client.

## Live acceptance

- Individual test: disabling `template_edit` changed Template Studio from two registered Template tools to only `template_list`.
- Master test: disabling WebMCP produced the browser notification `WebMCP tools are no longer available` and changed the rail state to `WebMCP access off`.
- Persistence test: the master-off state survived a full page reload.
- Restore test: re-enabling `template_edit` registered both `template_list` and `template_edit` again.
- Pointer test: the existing right-click/left-click preference remains available under Agent settings.
- Automated checks: 34 local test files, TypeScript checking, and the production build pass.

## General health

The information architecture is materially calmer and the permission model is now legible, granular, and demonstrably real. The remaining right sidebar has a single purpose: collaborate on the currently selected slot. The main remaining design risk is density inside Advanced rule editing; it is intentionally collapsed and should only be revisited if creators repeatedly need direct low-level control.

## Evidence limits

This audit verifies the local VibeStudio build and its live browser WebMCP registration behavior. It does not claim deployment, external-user usability testing, or Devpost judge acceptance.
